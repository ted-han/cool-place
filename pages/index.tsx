import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "styles/Home.module.css";
import icon_share from "../public/share.png";

export async function getStaticProps() {
  // 노션 DB에서 데이터 가져오기
  const placeRes = await fetch(
    `https://api.notion.com/v1/databases/${process.env.NOTION_DB}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    },
  );
  const place = await placeRes.json();
  const places = place.results.map((v: any) => {
    const name = v.properties?.["이름"]?.title[0]?.plain_text;
    const address = v.properties?.["주소"]?.rich_text[0]?.plain_text;
    const comment = v.properties?.["한줄평"]?.rich_text[0]?.plain_text;
    const type = v.properties?.["분류"]?.select?.name === "커피" ? 2 : 1;
    const imgUrl = v.properties?.["사진"]?.files[0]?.file?.url || "";
    const tags = v.properties?.["태그"]?.multi_select?.map((t: any) => t.name);
    const writer = v.properties?.["글쓴이"]?.people[0]?.name;
    return {
      name,
      address,
      tags,
      comment,
      type,
      imgUrl,
      writer,
    };
  });

  // 노션 페이지에서 데이터 가져오기
  const textRes = await fetch(
    `https://api.notion.com/v1/blocks/${process.env.NOTION_PAGE}/children?page_size=100`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    },
  );
  const text = await textRes.json();
  const plainText = text.results[0].paragraph.rich_text[0].plain_text;
  const geoInfo = JSON.parse(plainText);

  // 페이지정보에 lat,lng 있으면 사용, 없으면 naver geocode api로 확인
  const newPlaces = [];
  for (let v of places) {
    if (!v.name) continue;
    if (geoInfo[v.name]) {
      const { lat, lng, naverId, kakaoId } = geoInfo[v.name];
      newPlaces.push({
        ...v,
        lat: Number(lat),
        lng: Number(lng),
        naverId: Number(naverId),
        kakaoId: Number(kakaoId),
      });
    } else {
      const resGeo = await fetch(
        `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${v.address}`,
        {
          method: "GET",
          headers: {
            "X-NCP-APIGW-API-KEY-ID": `${process.env.NCP_CLIENT_ID}`,
            "X-NCP-APIGW-API-KEY": `${process.env.NCP_CLIENT_KEY}`,
          },
        },
      );
      const geocode = await resGeo.json();
      const lat = geocode.addresses[0].y;
      const lng = geocode.addresses[0].x;
      newPlaces.push({
        ...v,
        lat: Number(lat),
        lng: Number(lng),
        naverId: 0,
        kakaoId: 0,
      });
    }
  }

  return {
    props: {
      data: newPlaces,
    },
  };
}
interface Place {
  name: string;
  address: string;
  tags: string[];
  comment: string;
  type: number;
  imgUrl: string;
  writer: string;
  lat: number;
  lng: number;
  naverId: number;
  kakaoId: number;
}
interface Data {
  data: Place[];
}
interface MyLocation {
  lat: number;
  lng: number;
}

export default function Map({ data }: Data) {
  const mapRef = useRef<naver.maps.Map>();
  const markerRef = useRef<{ type: number; marker: any }[]>([]);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [myLocation, setMyLocation] = useState<MyLocation | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setMyLocation({
          lat: 37.4695704,
          lng: 127.065399,
        });
      },
    );
  }, []);

  const addMarker = useCallback(
    (type: number) => {
      data.map((v: Place, i: number) => {
        if (type !== 0 && type !== v.type) return;
        const location = new naver.maps.LatLng(v.lat, v.lng);
        const marker = new naver.maps.Marker({
          position: location,
          map: mapRef.current,
          title: v.name,
          icon: {
            content:
              '<div class="marker-box">' +
              `<span>${v.name}</span>` +
              `<img src="${
                v.type === 1 ? "/restaurant.png" : "/cafe.png"
              }" alt="" />` +
              "</div>",
            size: new naver.maps.Size(18, 18),
            anchor: new naver.maps.Point(44, 35),
          },
        });
        markerRef.current.push({
          type: v.type,
          marker: marker,
        });
        naver.maps.Event.addListener(marker, "click", function (e) {
          mapRef.current?.panTo(location, {
            duration: 300,
          });
          setIndex((prev) => {
            if (prev === i) {
              onClick(false);
              return null;
            }
            onClick(true);
            return i;
          });
        });
      });
    },
    [data],
  );

  useEffect(() => {
    if (!myLocation) return;
    mapRef.current = new naver.maps.Map("map", {
      center: new naver.maps.LatLng(myLocation.lat, myLocation.lng),
      zoom: 12,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
        style: naver.maps.ZoomControlStyle.SMALL,
      },
    });

    naver.maps.Event.addListener(mapRef.current, "click", function (e) {
      onClick(false);
      setIndex(null);
    });

    addMarker(0);
  }, [data, myLocation, addMarker]);

  const onClickCategory = (i: number) => {
    if (categoryIndex === i) return;
    if (categoryIndex === 0) {
      const type = i === 1 ? 2 : 1;
      const newMarkers = markerRef.current.filter((m) => {
        if (m.type === type) {
          m.marker.setMap(null);
          return false;
        }
        return true;
      });
      markerRef.current = newMarkers;
    } else if (i === 0) {
      const type = categoryIndex === 1 ? 2 : 1;
      addMarker(type);
    } else {
      markerRef.current.map((m) => {
        m.marker.setMap(null);
      });
      markerRef.current = [];
      addMarker(i);
    }
    setCategoryIndex(i);
  };

  const onClick = (isVisible: boolean) => {
    if (isVisible) {
      bottomSheetRef.current?.style.setProperty(
        "transform",
        "translateY(-250px)",
      );
      bottomSheetRef.current?.style.setProperty("height", "250px");
      bottomSheetRef.current?.style.setProperty("padding", "20px");
    } else {
      bottomSheetRef.current?.style.setProperty("transform", "translateY(0)");
      bottomSheetRef.current?.style.setProperty("height", "0px");
      bottomSheetRef.current?.style.setProperty("padding", "0");
    }
  };

  return (
    <>
      <div className={styles.mapWrapper}>
        <header className={styles.header}>
          <h1>힙힙</h1>
          <Image src={icon_share} alt="" width={24} height={24} />
        </header>
        <div id="map" className={styles.map}></div>
        <div className={styles.cetegory}>
          {["전체", "음식점", "카페"].map((c, i) => (
            <div
              key={c}
              className={`${styles.type} ${
                categoryIndex === i ? styles.on : ""
              }`}
              onClick={() => onClickCategory(i)}
            >
              <span>{c}</span>
            </div>
          ))}
        </div>
        <div className={styles.bottomSheet} ref={bottomSheetRef}>
          {index !== null && (
            <>
              <h3>{data[index]?.name}</h3>
              <div>
                <span>&quot;{data[index]?.comment}&quot;</span>
                <span> -{data[index]?.writer}</span>
              </div>
              <div>
                {data[index]?.tags?.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              {data[index]?.imgUrl && (
                <Image
                  src={data[index]?.imgUrl}
                  alt=""
                  width={100}
                  height={100}
                />
              )}
              <div>
                <Link
                  href={
                    data[index]?.naverId
                      ? `nmap://place?id=${data[index]?.naverId}`
                      : `nmap://search?query=${data[index]?.name}`
                  }
                  legacyBehavior
                >
                  <a target="_blank">네이버맵</a>
                </Link>
              </div>
              <br />
              <div>
                <Link
                  href={
                    data[index]?.kakaoId
                      ? `kakaomap://place?id=${data[index]?.kakaoId}`
                      : `kakaomap://search?q=${data[index]?.name}&p=${data[index]?.lat},${data[index]?.lng}`
                  }
                  legacyBehavior
                >
                  <a target="_blank">카카오맵</a>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

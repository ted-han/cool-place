import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "styles/Home.module.css";

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
  const places = place.results.map((v) => {
    const name = v.properties?.["이름"]?.title[0]?.plain_text;
    const address = v.properties?.["주소"]?.rich_text[0]?.plain_text;
    const comment = v.properties?.["한줄평"]?.rich_text[0]?.plain_text;
    const type = v.properties?.["분류"]?.select?.name === "커피" ? 2 : 1;
    const imgUrl = v.properties?.["사진"]?.files[0]?.file?.url || "";
    const tags = v.properties?.["태그"]?.multi_select?.map((t) => t.name);
    return {
      name,
      address,
      tags,
      comment,
      type,
      imgUrl,
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
      const { lat, lng } = geoInfo[v.name];
      newPlaces.push({
        ...v,
        lat,
        lng,
      });
    } else {
      const resGeo = await fetch(
        `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=서울 서초구 서초대로46길 20-7 1층`,
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
        lat,
        lng,
      });
    }
  }

  return {
    props: {
      data: newPlaces,
    },
  };
}

export default function Map({ data }) {
  const mapRef = useRef();
  const markerRef = useRef([]);
  const bottomSheetRef = useRef();
  const [index, setIndex] = useState(null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    setMyLocation({
      lat: "37.491233",
      lng: "127.010081",
    });

    // 테스트할때만 주석
    // if (navigator.geolocation) {
    //   console.log("geolocation");
    //   navigator.geolocation.getCurrentPosition((position) => {
    //     console.log(position);
    //     setMyLocation({
    //       lat: position.coords.latitude,
    //       lng: position.coords.longitude,
    //     });
    //   });
    // } else {
    //   setMyLocation({
    //     lat: 37.3595704,
    //     lng: 127.105399,
    //   });
    // }
  }, []);

  useEffect(() => {
    if (!myLocation) return;
    mapRef.current = new naver.maps.Map("map", {
      center: new naver.maps.LatLng(myLocation.lat, myLocation.lng),
      zoom: 12,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    });

    naver.maps.Event.addListener(mapRef.current, "click", function (e) {
      onClick(false);
      setTimeout(() => {
        setIndex(null);
      }, 100);
    });

    addMarker(0);
  }, [data, myLocation]);

  const addMarker = (type: number) => {
    data.map((v, i) => {
      if (type !== 0 && type !== v.type) return;
      const location = new naver.maps.LatLng(v.lat, v.lng);
      const marker = new naver.maps.Marker({
        position: location,
        map: mapRef.current,
      });
      markerRef.current.push({
        type: v.type,
        lat: v.lat,
        lng: v.lng,
        marker: marker,
      });
      naver.maps.Event.addListener(marker, "click", function (e) {
        // todo: 넣을지말지 고민
        // mapRef.current.panTo(location, {
        //   duration: 300,
        // });
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
  };

  const onClickCategory = (i) => {
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

  const onClick = (isVisible) => {
    if (isVisible) {
      bottomSheetRef.current?.style.setProperty(
        "transform",
        "translateY(-200px)",
      );
    } else {
      bottomSheetRef.current?.style.setProperty("transform", "translateY(0)");
    }
  };

  return (
    <>
      <div className={styles.mapWrapper}>
        <div id="map" className={styles.map}></div>
      </div>
      <div className={styles.cetegory}>
        {["전체", "음식점", "카페"].map((c, i) => (
          <div
            key={c}
            className={`${styles.type} ${categoryIndex === i ? styles.on : ""}`}
            onClick={() => onClickCategory(i)}
          >
            <span>{c}</span>
          </div>
        ))}
      </div>
      <div className={styles.bottomSheet} ref={bottomSheetRef}>
        <h3>{data[index]?.name}</h3>
        <div>
          <span>{data[index]?.comment}</span>
        </div>
        <div>
          {data[index]?.tags?.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        {data[index]?.imgUrl && (
          <Image src={data[index]?.imgUrl} alt="" width={50} height={50} />
        )}
      </div>
    </>
  );
}

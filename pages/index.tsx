import { useState, useEffect, useRef } from "react";
import styles from "styles/Home.module.css";

export async function getStaticProps() {
  const res = await fetch(
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
  const posts = await res.json();
  const dataa = posts.results.map((v) => {
    const name = v.properties?.["이름"]?.title[0]?.plain_text;
    const address = v.properties?.["주소"]?.rich_text[0]?.plain_text;
    const tags = v.properties?.["태그"]?.multi_select?.map((t) => t.name);
    return {
      name,
      address,
      tags,
    };
  });
  // console.log(dataa);

  // todo: 결과값 lat,lng 구해서 가공
  // todo: https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding

  // const resGeo = await fetch(
  //   `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=서울 서초구 서초대로46길 20-7 1층`,
  //   {
  //     method: "GET",
  //     headers: {
  //       "X-NCP-APIGW-API-KEY-ID": `${process.env.NCP_CLIENT_ID}`,
  //       "X-NCP-APIGW-API-KEY": `${process.env.NCP_CLIENT_KEY}`,
  //     },
  //   },
  // );
  // const geocode = await resGeo.json();

  const data = [
    {
      name: "동신면가",
      address: "서울 서초구 반포대로28길 31 1층",
      tags: ["한식"],
      lat: 37.491006,
      lng: 127.010081,
      type: 1,
    },
    {
      name: "설눈",
      address: "서울 서초구 서초대로46길 20-7 1층",
      tags: ["한식", "온반"],
      lat: 37.491233,
      lng: 127.009769,
      type: 1,
    },
    {
      name: "Cafe Z",
      address: "서울 서초구 서초대로46길 20-7 1층",
      tags: ["드립커피"],
      lat: 37.499233,
      lng: 127.029769,
      type: 2,
    },
  ];

  return {
    props: {
      data,
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
      lat: 37.491233,
      lng: 127.010081,
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
      console.log(e);
      setIndex(null);
      onClick(false);
    });

    addMarker(0);
    // data.map((v, i) => {
    //   const location = new naver.maps.LatLng(v.lat, v.lng);
    //   const marker = new naver.maps.Marker({
    //     position: location,
    //     map: mapRef.current,
    //   });
    //   markerRef.current.push({
    //     type: v.type,
    //     lat: v.lat,
    //     lng: v.lng,
    //     marker: marker,
    //   });
    //   naver.maps.Event.addListener(marker, "click", function (e) {
    //     // todo: 넣을지말지 고민
    //     // mapRef.current.panTo(location, {
    //     //   duration: 300,
    //     // });
    //     setIndex((prev) => {
    //       if (prev === i) {
    //         onClick(false);
    //         return null;
    //       }
    //       onClick(true);
    //       return i;
    //     });
    //   });
    // });
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

  console.log(markerRef.current);

  const onClickCategory = (i) => {
    if (categoryIndex === i) return;
    // console.log(markerRef.current);

    // todo: 마커 삭제할 때 markerRef.current 도 업데이트
    // todo: 마커 추가할 때 useEffect때 하는거 함수로 떼서 사용

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
      console.log(markerRef.current);
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
      </div>
    </>
  );
}

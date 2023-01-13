import { useState } from "react";
import styles from "styles/Home.module.css";

export async function getStaticProps() {
  return {
    props: {
      password: process.env.DEPLOY_PASSWORD,
    },
  };
}

export default function Deploy({ password }: { password: string }) {
  const [result, setResult] = useState("");

  const onClick = async () => {
    const key = window.prompt("Enter password");
    if (!key) return;
    if (key !== password) {
      window.alert("Wrong password");
      return;
    }
    const result = await fetch(`/api`, {
      method: "GET",
    });
    if (result.status === 200) {
      const posts = await result.json();
      setResult(posts.msg);
      return;
    }
    const posts = await result.json();
    setResult(posts.msg);
  };
  return (
    <div className={styles.deployBox}>
      <div className={styles.deploy} onClick={onClick}>
        <span>Start deploy</span>
      </div>
      {result && <p>{result}</p>}
    </div>
  );
}

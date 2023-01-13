import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  msg: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  try {
    await res.revalidate("/");
    return res.json({ msg: "success!" });
  } catch (err) {
    return res.status(500).json({ msg: "Error revalidating" });
  }
}

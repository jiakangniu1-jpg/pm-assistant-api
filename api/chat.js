export default async function handler(req, res) {
  res.status(200).json({
    message: "Vercel 云函数运行成功"
  });
}

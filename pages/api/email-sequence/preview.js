export default function handler(req, res) {
  res.status(200).json({ 
    message: "API Working!", 
    coach_id: req.query.coach_id || "7",
    email_type: req.query.email_type || "test" 
  });
}
// API test Fr 11 Jul 2025 19:02:08 CEST
// API test Fr 11 Jul 2025 19:04:25 CEST

export default function handler(req, res) {
  res.status(200).json({ 
    message: "API Working!", 
    coach_id: req.query.coach_id || "7",
    email_type: req.query.email_type || "test" 
  });
}

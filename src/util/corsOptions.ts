const corsOptions = {
  origin: true, // Allow all origins dynamically (Cors *)
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

export = corsOptions;

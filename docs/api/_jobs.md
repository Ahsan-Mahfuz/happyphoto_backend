# Background Jobs

This document provides a cross-module index of all background jobs and cron tasks running in the system.

## Schedule

| Job Name                                    | Module                            | Schedule (cron) | Schedule (human) | Purpose                                   | Monitoring |
| ------------------------------------------- | --------------------------------- | --------------- | ---------------- | ----------------------------------------- | ---------- |
| Clean expired activation/verification codes | [auth](./auth.md#background-jobs) | `*/10 * * * *`  | Every 10 minutes | Unsets expired OTPs and associated fields | N/A        |

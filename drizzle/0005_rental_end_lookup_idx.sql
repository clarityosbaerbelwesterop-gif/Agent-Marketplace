-- Composite indexes for POST /api/rentals/[id]/end (close open sessions, cancel queued/running runs).
CREATE INDEX "agent_runs_session_id_status_idx" ON "agent_runs" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "agent_sessions_rental_id_status_idx" ON "agent_sessions" USING btree ("rental_id","status");

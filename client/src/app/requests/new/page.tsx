"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function NewRequestPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("You need to log in again before submitting a maintenance request.");
      return;
    }

    setSubmitting(true);
    try {
      await (await import("@/lib/api")).api("/api/maintenance", {
        method: "POST",
        token,
        body: {
          title,
          description,
          user_reported_urgency: Number(priority),
        },
      });
      router.replace("/tenant/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to submit maintenance request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-4 text-white">Submit New Maintenance Request</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          placeholder="Short title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Describe the issue..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <select
          className="w-full p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="1">Low</option>
          <option value="2">Medium</option>
          <option value="3">High</option>
          <option value="4">Emergency</option>
        </select>
        {!token && <p className="text-sm text-yellow-300">Log in to submit a maintenance request.</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex space-x-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? <LoadingSpinner /> : "Submit"}
          </Button>
          <Button variant="secondary" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

import Link from "next/link";
import { Calendar, Clock, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900">BookFlow</h1>
          <div className="flex gap-3">
            <Link
              href="/book"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Book Now
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-bold tracking-tight text-slate-900">
            Effortless Appointment Booking
          </h2>
          <p className="mt-6 text-lg text-slate-600">
            A modern, professional booking platform. Schedule appointments,
            manage your calendar, and grow your business.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/book"
              className="rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              Book an Appointment
            </Link>
            <Link
              href="/my-bookings"
              className="rounded-lg border px-6 py-3 text-base font-medium hover:bg-slate-50"
            >
              My Bookings
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <Calendar className="h-10 w-10 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">Easy Scheduling</h3>
            <p className="mt-2 text-sm text-slate-600">
              Pick a service, choose a time, and book in seconds.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <Clock className="h-10 w-10 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">Real-Time Availability</h3>
            <p className="mt-2 text-sm text-slate-600">
              See live availability and never double-book.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <Users className="h-10 w-10 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">Staff Management</h3>
            <p className="mt-2 text-sm text-slate-600">
              Assign staff, manage schedules, and track performance.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

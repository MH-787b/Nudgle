import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Nudgle",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <Link
          href="/"
          className="text-sm text-surface-500 hover:text-white transition-colors mb-8 inline-block"
        >
          &larr; Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-surface-500 font-mono mb-12">
          Last updated: 2 May 2026
        </p>

        <div className="space-y-8 text-surface-600 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              Who we are
            </h2>
            <p>
              Nudgle is operated by Max Hulme, a sole trader based in the
              United Kingdom. Our website is{" "}
              <a
                href="https://nudgle.co.uk"
                className="text-brand-400 hover:underline"
              >
                nudgle.co.uk
              </a>
              . You can contact us at{" "}
              <a
                href="mailto:max@nudgle.co.uk"
                className="text-brand-400 hover:underline"
              >
                max@nudgle.co.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              What data we collect
            </h2>
            <p className="mb-3">
              We collect only what is necessary to provide the service:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Account information</strong> —
                email address and business name when you sign up.
              </li>
              <li>
                <strong className="text-white">Appointment data</strong> —
                client names, phone numbers, email addresses, and appointment
                times that you add to Nudgle.
              </li>
              <li>
                <strong className="text-white">Google Calendar data</strong> —
                if you connect your Google Calendar, we read your calendar
                events to check availability and write appointment events. We
                do not store your calendar data beyond what is needed for
                display and conflict checking.
              </li>
              <li>
                <strong className="text-white">WhatsApp messages</strong> — if
                your clients book via WhatsApp, we process the conversation to
                complete the booking. We do not store message content after the
                booking is confirmed.
              </li>
              <li>
                <strong className="text-white">Payment information</strong> —
                payments are handled entirely by Gumroad. We do not collect or
                store card details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              How we use your data
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>To send appointment reminders via email, WhatsApp, or SMS.</li>
              <li>To display your appointments and calendar on the dashboard.</li>
              <li>To check Google Calendar availability for booking.</li>
              <li>To process WhatsApp bookings from your clients.</li>
              <li>To manage your subscription and billing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              Third-party services
            </h2>
            <p className="mb-3">We use the following services to operate Nudgle:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-white">Supabase</strong> — database and
                authentication (hosted in the EU).
              </li>
              <li>
                <strong className="text-white">Resend</strong> — sending
                reminder and confirmation emails.
              </li>
              <li>
                <strong className="text-white">Twilio</strong> — sending SMS
                and WhatsApp messages.
              </li>
              <li>
                <strong className="text-white">Google Calendar API</strong> —
                reading and writing calendar events (only when you connect your
                account).
              </li>
              <li>
                <strong className="text-white">Gumroad</strong> — payment
                processing and subscription management.
              </li>
              <li>
                <strong className="text-white">Vercel</strong> — hosting.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              Google Calendar &amp; user data
            </h2>
            <p className="mb-3">
              Nudgle requests access to your Google Calendar to provide
              availability checking and appointment syncing. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>We read your calendar events to check for scheduling conflicts.</li>
              <li>We create, update, and delete calendar events when you manage appointments in Nudgle.</li>
              <li>We do not share your Google Calendar data with any third party.</li>
              <li>We do not use your Google Calendar data for advertising or any purpose unrelated to the service.</li>
              <li>You can disconnect your Google Calendar at any time from the Settings page.</li>
            </ul>
            <p className="mt-3">
              Our use of Google user data complies with the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-brand-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              Data retention
            </h2>
            <p>
              We keep your data for as long as your account is active. If you
              cancel your subscription, your data is retained for 30 days in
              case you reactivate, then permanently deleted. You can request
              immediate deletion at any time by emailing{" "}
              <a
                href="mailto:max@nudgle.co.uk"
                className="text-brand-400 hover:underline"
              >
                max@nudgle.co.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              Your rights
            </h2>
            <p className="mb-3">Under UK GDPR, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Withdraw consent for data processing at any time.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a
                href="mailto:max@nudgle.co.uk"
                className="text-brand-400 hover:underline"
              >
                max@nudgle.co.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Cookies</h2>
            <p>
              We use only essential cookies required for authentication and
              session management. We do not use tracking cookies or analytics
              cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Changes</h2>
            <p>
              We may update this policy from time to time. Changes will be
              posted on this page with an updated date.
            </p>
          </section>
        </div>
      </div>

      <footer className="px-4 sm:px-8 py-8 text-sm text-surface-500 border-t border-surface-300 max-w-3xl mx-auto">
        <span className="font-mono">
          &copy; 2026 Max Hulme trading as Nudgle
        </span>
      </footer>
    </div>
  );
}

You are a senior full-stack engineer. Continue building my existing Appointment Booking System into a production-ready SaaS-ready platform.

Current stack:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma

Important:
- Do NOT rebuild from scratch
- First inspect the existing codebase and understand current architecture
- Preserve all working features
- Extend the current system cleanly
- Use scalable folder structure and good naming
- Keep the code production-ready
- Fix any type errors, build errors, lint issues, and broken imports along the way

Current completed features:
- admin/staff login
- service management
- customer management
- booking management
- calendar/schedule view
- customer booking page
- booking status flow
- reminder notification
- business hours settings
- overlapping booking prevention
- responsive design
- SaaS-ready architecture foundation
- Phase 2 Feature 1 (online deposit / prepayment support) is already completed

Now continue implementation starting from PHASE 2 FEATURE 2 onward.

PHASE 2 REMAINING FEATURES
2. Customer self-service booking management
   - Customers can view booking details
   - Customers can reschedule booking
   - Customers can cancel booking
   - Respect cancellation/reschedule policy windows
   - Prevent invalid status transitions

3. Staff selection and assignment
   - Customers can choose a staff member during booking
   - If no staff is selected, system can auto-assign an available one
   - Prevent double-booking per staff
   - Support staff-specific working hours

4. Buffer time support
   - Add before-buffer and after-buffer per service
   - Use buffer when calculating slot availability
   - Prevent bookings that violate buffer rules

5. Intake form before appointment
   - Admin can configure intake questions per service
   - Customer fills form during booking
   - Support text, textarea, select, checkbox
   - Save answers linked to booking

PHASE 3 FEATURES
6. Packages / memberships / courses
   - Customers can purchase package plans
   - Track remaining sessions
   - Deduct usage automatically when booking is completed
   - Prevent overuse when no remaining sessions exist

7. Analytics dashboard
   - total bookings
   - completed bookings
   - cancelled bookings
   - no-show count
   - revenue summary
   - bookings by service
   - bookings by staff
   - peak booking times
   - repeat customer count
   - use clean dashboard cards and charts

8. Waitlist system
   - Allow customers to join waitlist for unavailable slots
   - When a slot becomes free, notify eligible waitlist customers
   - Add admin view for waitlist management

9. Multi-branch foundation
   - Add branch-aware data model where needed
   - Services, staff, bookings, business hours, holidays should support branch scope
   - Update admin UI and filters to work with branches

10. Strengthen multi-tenant SaaS architecture
   - Ensure all business-owned data is scoped by business_id
   - Review access control for admin/staff/customer roles
   - Prevent cross-business data leakage
   - Prepare system for future subscription billing and white-label support

DELIVERABLES
Please implement everything completely and update the existing codebase with:

1. Folder structure updates
2. Prisma schema changes
3. Prisma migrations
4. Seed data updates
5. Database relations and constraints
6. API routes / server actions / services
7. Validation with Zod
8. Error handling and user-friendly messages
9. Frontend pages and UI flows
10. Reusable components
11. Dashboard widgets and charts
12. Status transition rules
13. Notification hooks/placeholders
14. Access control / authorization checks
15. Loading states, empty states, and form states
16. Mobile responsive UI
17. Comments only where necessary
18. Final cleanup so the project runs without errors

UI REQUIREMENTS
- Use shadcn/ui components where appropriate
- Keep design modern, clean, and professional
- Make admin dashboard look premium
- Make booking flow simple and fast
- Ensure responsive layout for desktop, tablet, and mobile

TECHNICAL REQUIREMENTS
- Use Prisma best practices
- Normalize database design appropriately
- Add indexes where useful
- Prevent race conditions in booking creation
- Use transactional logic where needed
- Keep business logic separated from UI
- Use typed DTOs / schemas / interfaces
- Use consistent status enums
- Keep future Stripe, LINE, SMS, and Google Calendar integrations easy to add later

BOOKING LOGIC RULES
- No overlapping bookings for the same staff
- Respect service duration + buffer time
- Respect business hours, staff hours, holidays, and branch context
- Reschedule must revalidate slot availability
- Cancellation must follow policy rules
- Completed bookings can trigger package deduction and analytics updates
- Deposit-required bookings should follow the existing payment logic already implemented

WHAT I WANT FROM YOU
- First inspect the project and summarize what already exists
- Then identify what has already been completed for Phase 2 Feature 1 and do not redo it
- Then create a concrete implementation plan for the remaining features
- Then implement the remaining features directly in the codebase
- After implementation, review the project and fix inconsistencies
- At the end, provide a summary of:
  - files created
  - files updated
  - schema changes
  - new routes
  - major business rules added
  - anything still mocked or left ready for future integration

Do the work autonomously and thoroughly. Do not stop at planning only. Implement the actual code changes.

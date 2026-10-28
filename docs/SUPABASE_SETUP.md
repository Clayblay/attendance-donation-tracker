# Setting up your online account (Supabase)

This takes about 15 minutes and is free. You only do it once.
Screens on supabase.com change now and then, so a button may be named a little differently.

## 1. Create the project
1. Go to **supabase.com** and click **Start your project**. Sign up (the email you use here is your account owner email).
2. Click **New project**. Give it a name (for example, "Attendance Tracker"), choose a **database password** (save it somewhere safe), pick the region closest to you, and click **Create new project**.
3. Wait a minute or two until the project finishes setting up.

## 2. Copy your two connection values
1. In the left menu click the **gear icon (Project Settings)**, then **API** (it may be called **API Keys** or **Data API**).
2. Copy the **Project URL**. It looks like `https://abcdefghijkl.supabase.co`.
3. Copy the **anon / public key**. It is a long text starting with `eyJ` (newer projects may call it a "publishable key" starting with `sb_publishable_`).
4. **Do not copy the "service_role" key.** That is a secret master key. The app refuses it on purpose.

## 3. Create your login
1. Left menu: **Authentication**, then **Users**.
2. Click **Add user**, then **Create new user**.
3. Type your email and a password (at least 8 characters). Tick **Auto Confirm User**. Click **Create user**.
   Your email address is your username.

## 4. Turn off public sign-ups (so nobody else can create a login)
1. Authentication, then **Sign In / Providers** (or **Providers**), then **Email**.
2. Make sure **"Enable Email provider" stays ON**. Turn **off** only "Allow new users to sign up" and save.
   (If you switch off the whole Email provider, nobody can sign in, and the app shows "Email logins are disabled".)

## 5. Allow password-reset links to come back to the app
1. Authentication, then **URL Configuration**.
2. Under **Redirect URLs** click **Add URL** and add: `http://localhost:8081`
3. Save.

## 6. Connect the app
1. In the app, open **Settings, then Online account**.
2. Paste the Project URL and the public key, and tap **Connect**.
3. The app now asks you to sign in. Use the email and password from step 3.

## 7. Create the place your data is saved (needed for sync)
1. In Supabase, open **SQL Editor** in the left menu, then click **New query**.
2. Paste everything in the box below, then click **Run**. It should say "Success".
   (The same text is in the app: Settings, Online account, **Show setup SQL**.)

```sql
create table if not exists public.app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  device text
);

alter table public.app_data enable row level security;

drop policy if exists "own row select" on public.app_data;
drop policy if exists "own row insert" on public.app_data;
drop policy if exists "own row update" on public.app_data;

create policy "own row select" on public.app_data
  for select using (auth.uid() = user_id);
create policy "own row insert" on public.app_data
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.app_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

This creates one private table. Row-level security makes sure only you, signed in, can read or change your row.

## How syncing works
- Your people, gifts, attendance, notes and templates are saved online as one copy that belongs to your login.
- Colours and Dashboard layout stay on each device.
- A change is sent a few seconds after you make it. The app also checks the online copy when it opens, when you come back to it, and every couple of minutes.
- If this device and the online copy both changed while apart, **nothing is overwritten**. A screen shows both versions and asks which to keep. If you use the online copy, a backup of this device's data is saved first (Settings, Online account, **Restore earlier data**).
- If you are offline, changes wait and are sent when you are back online.

## If you forget your password
- On the sign-in screen tap **Forgot password?** and enter your email. A link arrives by email. **Open the link in your computer's web browser** (the web version of the app must be running at localhost:8081). Choose a new password there.
- The free built-in email service sends only a couple of emails per hour, which is plenty for one person. Check your spam folder.
- **Always works as a backup:** sign in to supabase.com, open your project, then Authentication, Users, click your user, and choose **Send password recovery** or set a new password.

## If you forget your username
Your username is your email address. On the sign-in screen tap **Forgot username?**. It shows the email you last signed in with on this device (partly hidden), and can email a sign-in link to any address you think you used.

## Good to know
- Your data is still stored on each device. Syncing it online is the next step.
- Never share your project's `service_role` key or your database password.

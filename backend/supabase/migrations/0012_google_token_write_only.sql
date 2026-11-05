-- Make the Google refresh token write-only from the browser.
--
-- Until now RLS let a signed-in user SELECT their own row in
-- google_calendar_tokens, so any XSS in the web app could read a long-lived
-- Google credential. The browser only ever needs to:
--   * store a freshly issued token  -> save_google_calendar_token() below
--   * check whether one exists      -> SELECT user_id
--   * disconnect                    -> DELETE
-- The sync-google-calendar Edge Function reads tokens with the service role,
-- which is unaffected by these grants.

revoke all on table public.google_calendar_tokens from anon, authenticated;

grant select (user_id, calendar_id, created_at, updated_at)
  on public.google_calendar_tokens to authenticated;
grant delete on public.google_calendar_tokens to authenticated;

create or replace function public.save_google_calendar_token(p_refresh_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_refresh_token is null or length(trim(p_refresh_token)) = 0 then
    raise exception 'A refresh token is required' using errcode = '22023';
  end if;

  insert into public.google_calendar_tokens (user_id, refresh_token, updated_at)
  values (auth.uid(), p_refresh_token, now())
  on conflict (user_id) do update
    set refresh_token = excluded.refresh_token,
        -- A new grant invalidates any cached access token.
        access_token = null,
        access_token_expires_at = null,
        updated_at = now();
end;
$$;

revoke all on function public.save_google_calendar_token(text) from public, anon;
grant execute on function public.save_google_calendar_token(text) to authenticated;

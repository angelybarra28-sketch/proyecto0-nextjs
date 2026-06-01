create or replace function toggle_user_active_atomic(
  p_target_user_id uuid,
  p_is_active boolean
)
returns table(previous_is_active boolean, new_is_active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_profile record;
  v_active_admin_count integer;
begin
  -- 1. Lock target row
  select role, is_active into v_target_profile
  from profiles
  where user_id = p_target_user_id
  for update;

  if not found then
    -- Auto-create profile for orphan users.
    -- If the user does not exist in auth.users, the FK raises foreign_key_violation.
    begin
      insert into profiles (user_id, role, full_name, is_active)
      values (p_target_user_id, 'CUSTOMER', '', true);
    exception
      when foreign_key_violation then
        raise exception 'USER_NOT_FOUND';
      when unique_violation then
        -- concurrent request already created the profile
        null;
    end;

    select role, is_active into v_target_profile
    from profiles
    where user_id = p_target_user_id
    for update;

    if not found then
      raise exception 'USER_NOT_FOUND';
    end if;
  end if;

  -- Idempotency: already in desired state
  if v_target_profile.is_active = p_is_active then
    return query select v_target_profile.is_active, p_is_active;
    return;
  end if;

  -- 2. Deactivating an active ADMIN requires locking the entire active admin set
  --    using the role read AFTER acquiring the lock.
  if not p_is_active and v_target_profile.role = 'ADMIN' then
    -- Lock all active admins in deterministic order to avoid deadlocks
    perform 1 from profiles
    where role = 'ADMIN' and is_active = true
    order by user_id
    for update;

    -- Re-verify after acquiring locks
    select role, is_active into v_target_profile
    from profiles
    where user_id = p_target_user_id;

    if v_target_profile.is_active = p_is_active then
      return query select v_target_profile.is_active, p_is_active;
      return;
    end if;

    -- Reject if this would leave 0 active admins
    select count(*) into v_active_admin_count
    from profiles
    where role = 'ADMIN'
      and is_active = true
      and user_id <> p_target_user_id;

    if v_active_admin_count = 0 then
      raise exception 'LAST_ADMIN';
    end if;
  end if;

  -- 3. Apply the update
  update profiles
  set is_active = p_is_active, updated_at = now()
  where user_id = p_target_user_id;

  if not found then
    raise exception 'PROFILE_UPDATE_NO_ROWS';
  end if;

  return query select v_target_profile.is_active, p_is_active;
end;
$$;

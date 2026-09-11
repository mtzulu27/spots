-- Review and apply explicitly to the target project; no row-level user data is exposed.
create or replace function public.get_spot_like_counts(spot_ids bigint[])
returns table(spot_id bigint, likes_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(cardinality(spot_ids), 0) > 200 then
    raise exception 'At most 200 place IDs per request';
  end if;
  return query
    select l.spot_id, count(*)
    from public.spot_likes l
    where l.spot_id = any(spot_ids)
    group by l.spot_id;
end;
$$;
revoke all on function public.get_spot_like_counts(bigint[]) from public;
grant execute on function public.get_spot_like_counts(bigint[]) to authenticated;

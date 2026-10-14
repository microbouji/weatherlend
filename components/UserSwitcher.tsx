"use client";

import { switchUser } from "@/app/actions";

interface Props {
  users: { id: number; name: string }[];
  currentId: number;
}

/** Demo-user switcher (tender: no authentication, this stands in for login). */
export function UserSwitcher({ users, currentId }: Props) {
  return (
    <label className="flex items-center gap-1 text-stone-600">
      Acting as
      <select
        value={currentId}
        onChange={(event) => switchUser(Number(event.target.value))}
        className="rounded-md border border-stone-300 bg-white px-1 py-0.5 text-stone-900"
        aria-label="Switch demo user"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}

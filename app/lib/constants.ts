import type { SimpleStep } from "./magicMove/types";

export const DEFAULT_STEPS: SimpleStep[] = [
  {
    id: "default-step-1",
    code: `import { useState, useEffect } from 'react';

export function User() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(u => {
        setUser(u);
        setLoading(false);
        setError(null);
      })
      .catch(e => {
        setUser(null);
        setLoading(false);
        setError(e);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;
  return <div>{user.name}</div>;
}`,
  },
  {
    id: "default-step-2",
    code: `import { useQuery } from '@tanstack/react-query';

export function User() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: () => fetch('/api/user').then(r => r.json())
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;
  return <div>{user.name}</div>;
}`,
  },
];

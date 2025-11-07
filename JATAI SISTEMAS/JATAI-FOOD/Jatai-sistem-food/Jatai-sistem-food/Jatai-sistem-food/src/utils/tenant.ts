export const getCurrentTenantId = (): string | null => {
  const loggedInUser = localStorage.getItem('username');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return (loggedInUser && isLoggedIn) ? loggedInUser : null;
};
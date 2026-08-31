// Never hardcode the API origin — always read from env.
// See eventor-dependencies-deployment.md §2.3.
export const ApiDomain = import.meta.env.VITE_API_DOMAIN;

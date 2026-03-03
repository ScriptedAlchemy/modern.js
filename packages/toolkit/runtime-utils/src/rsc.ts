// RSC runtime needs the react-server-client entry to keep router APIs
// (createBrowserRouter/createStaticRouter/StaticRouterProvider) available
// under react-server conditions.
export * from 'react-router/internal/react-server-client';

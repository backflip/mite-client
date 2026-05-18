export type Route = {
  path: string;
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};

export type Routes = {
  root: Route;
  add: Route;
  edit: Route;
  toggle: Route;
  delete: Route;
  invoice: Route;
};

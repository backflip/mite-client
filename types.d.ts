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
  total: Route;
  tracking: Route;
};

export type GetPage<Props> = ({
  req,
  routes,
  props,
}: {
  req: IncomingMessage;
  routes: Routes;
  props: Props;
}) => Promise<{
  content: string;
  customStyles?: string;
  customScritps?: string;
}>;

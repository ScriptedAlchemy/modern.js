export { renderToReadableStream } from 'react-server-dom-rspack/server.node';
import {
  loadServerAction,
  renderToReadableStream,
} from 'react-server-dom-rspack/server.node';
import { decodeReply } from 'react-server-dom-rspack/server.node';
import { createActionHandler } from './actionHandler';
export { createFromReadableStream } from 'react-server-dom-rspack/client.node';
export {
  registerClientReference,
  registerServerReference,
} from 'react-server-dom-rspack/server.node';

type RenderRscOptions = {
  element: unknown;
};

export const renderRsc = (options: RenderRscOptions) => {
  const readable = renderToReadableStream(options.element);
  return readable;
};

export const handleAction = createActionHandler({
  loadServerAction,
  decodeReply,
  renderRscStream: element => renderRsc({ element }),
});

type CreateActionHandlerOptions = {
  loadServerAction: (actionId: string) => unknown;
  decodeReply: (body: string | FormData) => Promise<unknown[]>;
  renderRscStream: (element: unknown) => ReadableStream;
};

export const RSC_FLIGHT_CONTENT_TYPE = 'text/x-component';

export const createActionHandler = (options: CreateActionHandlerOptions) => {
  return async (req: Request) => {
    try {
      const serverReference = req.headers.get('x-rsc-action');
      if (!serverReference) {
        return new Response('Cannot find server reference', { status: 404 });
      }

      const action = options.loadServerAction(serverReference);
      if (typeof action !== 'function') {
        console.error(
          '[RSC] Invalid action: server reference is not a function, serverReference:',
          serverReference,
        );
        return new Response('Invalid action', { status: 400 });
      }

      const contentType = req.headers.get('content-type');

      let args;
      try {
        if (contentType?.includes('multipart/form-data')) {
          const formData = await req.formData();
          args = await options.decodeReply(formData);
        } else {
          const text = await req.text();
          args = await options.decodeReply(text);
        }
      } catch (error) {
        console.error(
          '[RSC] Failed to decode request arguments, error:',
          error instanceof Error ? error.message : String(error),
          'contentType:',
          contentType || 'unknown',
        );
        return new Response('Failed to decode request arguments', {
          status: 400,
        });
      }

      // Handle both sync and async actions
      const result = await Promise.resolve(action.apply(null, args));
      const stream = options.renderRscStream(result);

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': RSC_FLIGHT_CONTENT_TYPE,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(
        '[RSC] Error handling server action, error:',
        errorMessage,
        errorStack ? `\n${errorStack}` : '',
      );
      const isDev = process.env.NODE_ENV === 'development';
      const body = isDev
        ? `Internal server error\n${errorMessage}\n${errorStack || ''}`
        : 'Internal server error';
      return new Response(body, { status: 500 });
    }
  };
};

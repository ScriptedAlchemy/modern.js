import {
  RSC_FLIGHT_CONTENT_TYPE,
  createActionHandler,
} from '../src/server/rsc/actionHandler';

const loadServerActionMock = rstest.fn();
const decodeReplyMock = rstest.fn();
const renderRscStreamMock = rstest.fn();

describe('handleAction', () => {
  beforeEach(() => {
    loadServerActionMock.mockReset();
    decodeReplyMock.mockReset();
    renderRscStreamMock.mockReset();
  });

  test('returns flight content type for successful server action responses', async () => {
    const handleAction = createActionHandler({
      loadServerAction: loadServerActionMock,
      decodeReply: decodeReplyMock,
      renderRscStream: renderRscStreamMock,
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });

    loadServerActionMock.mockReturnValue(() => null);
    decodeReplyMock.mockResolvedValue([]);
    renderRscStreamMock.mockReturnValue(stream);

    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: {
        'x-rsc-action': 'app/actions#default',
        'content-type': 'text/plain',
      },
      body: 'serialized-action-args',
    });

    const response = await handleAction(req);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(RSC_FLIGHT_CONTENT_TYPE);
  });
});

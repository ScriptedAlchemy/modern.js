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
    rstest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    rstest.restoreAllMocks();
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

  test('returns 404 when action header is missing', async () => {
    const handleAction = createActionHandler({
      loadServerAction: loadServerActionMock,
      decodeReply: decodeReplyMock,
      renderRscStream: renderRscStreamMock,
    });

    const req = new Request('http://localhost/', {
      method: 'POST',
      body: 'serialized-action-args',
    });
    const response = await handleAction(req);
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Cannot find server reference');
    expect(loadServerActionMock).not.toHaveBeenCalled();
  });

  test('returns 400 for invalid action values', async () => {
    const handleAction = createActionHandler({
      loadServerAction: loadServerActionMock,
      decodeReply: decodeReplyMock,
      renderRscStream: renderRscStreamMock,
    });

    loadServerActionMock.mockReturnValue('not-a-function');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: {
        'x-rsc-action': 'app/actions#default',
      },
      body: 'serialized-action-args',
    });
    const response = await handleAction(req);
    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid action');
  });

  test('returns 400 when argument decoding fails', async () => {
    const handleAction = createActionHandler({
      loadServerAction: loadServerActionMock,
      decodeReply: decodeReplyMock,
      renderRscStream: renderRscStreamMock,
    });

    loadServerActionMock.mockReturnValue(() => null);
    decodeReplyMock.mockRejectedValue(new Error('decode failed'));
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: {
        'x-rsc-action': 'app/actions#default',
        'content-type': 'text/plain',
      },
      body: 'serialized-action-args',
    });
    const response = await handleAction(req);
    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe(
      'Failed to decode request arguments',
    );
  });

  test('decodes multipart form payloads when content type is multipart', async () => {
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

    const formData = new FormData();
    formData.set('payload', 'value');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: {
        'x-rsc-action': 'app/actions#default',
      },
      body: formData,
    });
    const response = await handleAction(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(RSC_FLIGHT_CONTENT_TYPE);
    expect(decodeReplyMock.mock.calls[0]?.[0]).toBeInstanceOf(FormData);
  });

  test('returns 500 when action execution throws', async () => {
    const handleAction = createActionHandler({
      loadServerAction: loadServerActionMock,
      decodeReply: decodeReplyMock,
      renderRscStream: renderRscStreamMock,
    });

    loadServerActionMock.mockReturnValue(() => {
      throw new Error('boom');
    });
    decodeReplyMock.mockResolvedValue([]);

    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: {
        'x-rsc-action': 'app/actions#default',
        'content-type': 'text/plain',
      },
      body: 'serialized-action-args',
    });
    const response = await handleAction(req);
    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toContain('Internal server error');
  });
});

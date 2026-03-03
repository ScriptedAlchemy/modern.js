const WEBPACK_REQUIRE_SHIM = {
  u: (chunkId: string | number) => String(chunkId),
};

describe('requestCallServer pluggable action id resolver', () => {
  const runtimeGlobal = global as typeof global & {
    fetch?: typeof fetch;
    window?: { __MODERN_JS_ENTRY_NAME: string };
  };
  const originalFetch = runtimeGlobal.fetch;
  const originalWindow = runtimeGlobal.window;
  let requestCallServer: typeof import(
    '../src/client/callServer',
  ).requestCallServer;
  let setResolveActionId: typeof import(
    '../src/client/callServer',
  ).setResolveActionId;
  let setActionIdResolver: typeof import(
    '../src/client/callServer',
  ).setActionIdResolver;
  let setResolveActionRequestUrl: typeof import(
    '../src/client/callServer',
  ).setResolveActionRequestUrl;
  let setActionRequestUrlResolver: typeof import(
    '../src/client/callServer',
  ).setActionRequestUrlResolver;
  let fetchMock: ReturnType<typeof rstest.fn>;

  beforeAll(async () => {
    rstest.stubGlobal('__webpack_require__', WEBPACK_REQUIRE_SHIM);
    const mod = await import('../src/client/callServer');
    requestCallServer = mod.requestCallServer;
    setResolveActionId = mod.setResolveActionId;
    setActionIdResolver = mod.setActionIdResolver;
    setResolveActionRequestUrl = mod.setResolveActionRequestUrl;
    setActionRequestUrlResolver = mod.setActionRequestUrlResolver;
  });

  beforeEach(() => {
    runtimeGlobal.window = {
      __MODERN_JS_ENTRY_NAME: 'main',
    };

    fetchMock = rstest.fn(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response;
    });
    runtimeGlobal.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    setResolveActionId(undefined);
    setResolveActionRequestUrl(undefined);
    runtimeGlobal.window = {
      __MODERN_JS_ENTRY_NAME: 'main',
    };
  });

  afterAll(() => {
    runtimeGlobal.fetch = originalFetch;
    runtimeGlobal.window = originalWindow;
    rstest.unstubAllGlobals();
  });

  const expectActionHeader = (actionId: string, expectedUrl = '/') => {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callArgs[0]).toBe(expectedUrl);
    expect(
      (callArgs[1]?.headers as Record<string, string>)['x-rsc-action'],
    ).toBe(actionId);
  };

  test('passes through ids unchanged when no resolver is registered', async () => {
    await requestCallServer('some-action-id', []);

    expectActionHeader('some-action-id');
  });

  test('uses a synchronous resolver to remap action ids', async () => {
    setResolveActionId(id => `remote:myRemote:${id}`);

    await requestCallServer('foo', []);

    expectActionHeader('remote:myRemote:foo');
  });

  test('uses an async resolver to remap action ids', async () => {
    setResolveActionId(async id => {
      await Promise.resolve();
      return `remote:asyncRemote:${id}`;
    });

    await requestCallServer('bar', []);

    expectActionHeader('remote:asyncRemote:bar');
  });

  test('resolver can pass through ids unchanged', async () => {
    setResolveActionId(id => id);

    await requestCallServer('untouched', []);

    expectActionHeader('untouched');
  });

  test('wraps sync resolver errors with CallServerError', async () => {
    setResolveActionId(() => {
      throw new Error('resolver sync failure');
    });

    await expect(requestCallServer('broken-sync', [])).rejects.toMatchObject({
      name: 'CallServerError',
      statusCode: 1,
      url: '/',
    });
  });

  test('wraps async resolver rejections with CallServerError', async () => {
    setResolveActionId(async () => {
      throw new Error('resolver async failure');
    });

    await expect(requestCallServer('broken-async', [])).rejects.toMatchObject({
      name: 'CallServerError',
      statusCode: 1,
      url: '/',
    });
  });

  test('alias setter remaps action ids', async () => {
    setActionIdResolver(id => `alias:${id}`);

    await requestCallServer('action123', []);

    expectActionHeader('alias:action123');
  });

  test('uses custom request url resolver when registered', async () => {
    setResolveActionRequestUrl(entryName =>
      entryName ? `/custom/${entryName}` : '/custom',
    );
    runtimeGlobal.window = {
      __MODERN_JS_ENTRY_NAME: 'server-component-root',
    };

    await requestCallServer('entry-action', []);

    expectActionHeader('entry-action', '/custom/server-component-root');
  });

  test('alias request url resolver is used', async () => {
    setActionRequestUrlResolver(() => '/alias/custom');

    await requestCallServer('action123', []);

    expectActionHeader('action123', '/alias/custom');
  });

  test('wraps request url resolver errors with CallServerError', async () => {
    setResolveActionRequestUrl(() => {
      throw new Error('url resolver failure');
    });

    await expect(requestCallServer('broken-url', [])).rejects.toMatchObject({
      name: 'CallServerError',
      statusCode: 1,
      url: '/',
    });
  });

  test('uses entry specific action endpoint when entry name is not main/index', async () => {
    runtimeGlobal.window = {
      __MODERN_JS_ENTRY_NAME: 'server-component-root',
    };

    await requestCallServer('entry-action', []);

    expectActionHeader('entry-action', '/server-component-root');
  });

  test('falls back to root endpoint when window is unavailable', async () => {
    runtimeGlobal.window = undefined;

    await requestCallServer('no-window-action', []);

    expectActionHeader('no-window-action', '/');
  });
});

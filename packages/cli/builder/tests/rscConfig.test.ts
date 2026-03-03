import { describe, expect, test } from '@rstest/core';
import { ROUTE_SERVER_ENTRY_FILE_PATTERN } from '../src/plugins/rscConfig';

describe('rsc server-entry route pattern', () => {
  test('matches root routes files for server-entry injection', () => {
    expect(
      ROUTE_SERVER_ENTRY_FILE_PATTERN.test('/project/src/routes/page.tsx'),
    ).toBeTruthy();
    expect(
      ROUTE_SERVER_ENTRY_FILE_PATTERN.test('/project/src/routes/layout.ts'),
    ).toBeTruthy();
    expect(
      ROUTE_SERVER_ENTRY_FILE_PATTERN.test('/project/src/routes/$.jsx'),
    ).toBeTruthy();
  });

  test('matches nested routes files', () => {
    expect(
      ROUTE_SERVER_ENTRY_FILE_PATTERN.test('/project/src/routes/user/page.tsx'),
    ).toBeTruthy();
    expect(
      ROUTE_SERVER_ENTRY_FILE_PATTERN.test(
        'C:\\project\\src\\routes\\user\\layout.tsx',
      ),
    ).toBeTruthy();
  });

  test('does not match non-route component files', () => {
    expect(
      ROUTE_SERVER_ENTRY_FILE_PATTERN.test('/project/src/myroutes/page.tsx'),
    ).toBeFalsy();
    expect(
      ROUTE_SERVER_ENTRY_FILE_PATTERN.test('/project/src/routes/page.data.ts'),
    ).toBeFalsy();
  });
});

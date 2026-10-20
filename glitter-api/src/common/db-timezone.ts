/**
 * The database stores dates in `timestamp without time zone` columns, in UTC
 * (the server's TimeZone is GMT and defaults use now()). Without this, the pg
 * driver reads/writes those values in the API's LOCAL timezone — on a machine
 * set to Phnom Penh (UTC+7) every time came back 7 hours early ("8 hours
 * ago" for something that just happened) and saved JS dates 7 hours late.
 *
 * Treat them as UTC both ways, whatever timezone the API runs in.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pg = require('pg') as {
  types: {
    setTypeParser(oid: number, parse: (value: string) => unknown): void;
  };
  defaults: { parseInputDatesAsUTC: boolean };
};

const TIMESTAMP_WITHOUT_TZ = 1114;
pg.types.setTypeParser(
  TIMESTAMP_WITHOUT_TZ,
  (value: string) => new Date(`${value.replace(' ', 'T')}Z`),
);
pg.defaults.parseInputDatesAsUTC = true;

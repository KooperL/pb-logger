
routerAdd("get", "/realtime", (c) => {
  const html = $template.loadFiles(
    `${__hooks}/views/logs.html`,
  ).render({
    PB_HOST: process.env.PB_HOST
  })

  return c.html(200, html)
})

routerAdd("post", "api/custom/log", (c) => {
  try {
    const data = $apis.requestInfo(c).data;

    const logCollection = $app.dao().findCollectionByNameOrId("log");
    const logRecord = new Record(logCollection, {
      title: data?.title,
      detail: data?.detail,
      channel: data?.channel,
      level: data?.level,
      submitted_on: data?.submitted_on,
      tenant: data?.source?.tenant,
      source: data?.source?.source,
      thread: data?.system?.thread,
      host: data?.system?.host,
      identifier: data?.user?.identifier,
      session: data?.user?.session,
      session_inc: data?.user?.session_inc,
    });

    $app.dao().saveRecord(logRecord);


    return c.json(200, {
      success: true,
    });
  } catch (e) {
    return c.json(500, {
      success: false,
      message: JSON.stringify({ error: e }),
    });
  }
});


/* example usage
    curl -X POST https://pocketbase.endpoint.com/api/custom/log
    -H "Content-Type: application/json"
    -d '{
        "title": "Test Log",
        "detail": "This is a test log",
        "channel": "shell",
        "level": "info",
        "submitted_on": "2021-05-01T00:00:00Z",
        "source": {
            "source": "curl",
            "tenant": "admin"
        },
        "system": {
            "host": "macbook.local",
            "thread": "1"
        },
        "user": {
            "identifier": "kooper",
            "platform": "macos"
        }
    }'
*/

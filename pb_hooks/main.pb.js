
routerAdd("get", "/realtime", (c) => {
  const html = $template.loadFiles(
    `${__hooks}/views/logs.html`,
  ).render({
    PB_HOST: process.env.PB_HOST
  })

  return c.html(200, html)
})

// Every night, remove all records that are older than 5 days
cronAdd("purgeOldRecords", "0 0 * * *", () => {
  const date = new Date();
  date.setDate(date.getDate() - 5);
  const records = $app.findRecordsByFilter(
    "log",
    "created < {:date}", "-created",
    0,
    0,
    { date: date.toISOString().replace('T', ' ') },
  )
  records.forEach((record) => {
    $app.delete(record)
  })
})

routerAdd("post", "/api/v1/log", (c) => {
  try {
    const data = c.requestInfo().body;

    const logCollection = $app.findCollectionByNameOrId("log");
    const logRecord = new Record(logCollection)
    
    logRecord.set('title', data?.title)
    logRecord.set('detail', data?.detail)
    logRecord.set('channel', data?.channel)
    logRecord.set('level', data?.level)
    logRecord.set('submitted_on', data?.submitted_on)
    logRecord.set('tenant', data?.source?.tenant)
    logRecord.set('source', data?.source?.source)
    logRecord.set('thread', data?.system?.thread)
    logRecord.set('host', data?.system?.host)
    logRecord.set('identifier', data?.user?.identifier)
    logRecord.set('session', data?.user?.session)
    logRecord.set('session_inc', data?.user?.session_inc)
    logRecord.set('created', new Date().toISOString())

    $app.save(logRecord);


    return c.json(200, {
      success: true,
    });
  } catch (e) {
    return c.json(500, {
      success: false,
      message: e.message,
    });
  }
});


/* example usage
    curl -X POST https://pocketbase.endpoint.com/api/v1/log
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

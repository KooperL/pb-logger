
routerAdd("get", "/realtime", (c) => {
  const html = $template.loadFiles(
    `${__hooks}/views/logs.html`,
  ).render({
    PB_HOST: process.env.PB_HOST
  })

  return c.html(200, html)
})

// Create a collection for logs if it doesn't already exist
onAfterBootstrap((e) => {
  const existingCollection = $app.dao().findCollectionByNameOrId("log")
  if (existingCollection) {
    return
  }

  const collection = new Collection({
    name: "log",
    type: "base",
    system: false,
    schema: [
      {
        name: "title",
        type: "text",
        required: false,
      },
      {
        name: "detail",
        type: "text",
        required: false,
      },
      {
        name: "channel",
        type: "text",
        required: false,
      },
      {
        name: "level",
        type: "select",
        required: false,
        options: {
          maxSelect: 1,
          values: [
            "info",
            "debug",
            "log",
            "warning",
            "error",
            "critical"
          ]
        }
      },
      {
        name: "submitted_on",
        type: "date",
        required: false,
        options: {
          min: "",
          max: ""
        }
      },
      {
        name: "session",
        type: "text",
        required: false,
      },
      {
        name: "session_inc",
        type: "number",
        required: false,
        options: {
          min: null,
          max: null,
          noDecimal: false
        }
      },
      {
        name: "identifier",
        type: "text",
        required: false,
      },
      {
        name: "thread",
        type: "text",
        required: false,
      },
      {
        name: "host",
        type: "text",
        required: false,
      },
      {
        name: "tenant",
        type: "text",
        required: false,
      },
      {
        name: "source",
        type: "text",
        required: false,
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: null,
    deleteRule: null,
    options: {}
  });

  $app.dao().saveCollection(collection)

})

// Every night, remove all records that are older than 5 days
cronAdd("purgeOldRecords", "0 0 * * *", () => {
  const date = new Date();
  date.setDate(date.getDate() - 5);
  const records = $app.dao().findRecordsByFilter(
    "log",
    "created < {:date}", "-created",
    0,
    0,
    { date: date.toISOString().replace('T', ' ') },
  )
  records.forEach((record) => {
    $app.dao().deleteRecord(record)
  })
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

# yooznooz

host-it-yourself Usenet newsreader PWA

## Design factors

### Offline news reader

Eventually, the PWA should support offline reading. For example, if you're about
to hop onto transit with spotty connectivity, you would hit a button to load all
new unread articles, and then read them at your leisure while travelling.

This kind of bulk load is also friendly to news servers: the connection is
short-lived and bounded, with a clean disconnect.

Offline access means storing the article content in the browser, in either the
simple key-value-string LocalStorage, or in the IndexedDB.

#### Offline replies

Futher down the road would be the ability to compose a reply that would be
posted the next time you connect to the server.

### Distributed NNTP client

All browsers support fetching over HTTP(S), but not NNTP. This means those calls
must originate from the web server.

Some NNTP servers may limit the number of connections or requests from unique IP
addresses. A centralized web server making lots of requests for unique clients
could hit that quota. So the web server running as an NNTP client should be run
per user.

You could run the server locally and point your browser to that local server.
You could also run a personal instance of the server in the cloud; although it's
possible that you share an IP with someone else doing the same thing.

With offline reading, you would only have to run the web server for a few
minutes to fetch the latest messages and post replies.

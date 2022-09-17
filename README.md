# yooznooz

host-it-yourself Usenet newsreader PWA

## User Manual stub

### Running

1.  [Install Deno](https://deno.land/manual/getting_started/installation)
2.  Clone repo
3.  ```bash
    cd yooznooz
    deno task start
    ```
4.  http://localhost:8000/ from the same machine, or use a host or IP.

### Using

Currently, this is a barely complete minimum online news reader. With bugs.

#### Servers

The first run will redirect to `/servers` and prompt for a news server host
(hostname or IP). Only plain NNTP on the default port (119) is supported.
The servers cannot require any authentication.

Clicking `Add` will then pull the list of newsgroups there. This can be
repeated to add more groups, but only the first server is supported for
actual reading. Multi-server support comes later (after figuring out how to
handle the same group in multiple servers, for example); only add one.

The server list is stored in a cookie, which can be cleared in the usual
ways. In that case, you must enter the server again. Other data is in
LocalStorage, so things like last article seen will reappear once the
server is restored.

#### Groups

Click a group name to load the article list. Articles are shown 100 per
page, newest first. The article number range is displayed. If for whatever
reason there are gaps in the article numbers, the range will say `sparse`
and you may note the numbers are more than 99 apart. You can click for the
next page, or use the Back button.

The initial load of a group will note the highest (most recent) article
number, and that article's date. This is used to populate the group list,
to show if there are new articles since you last visited; and if not, the
date of the most recent article, to give you a sense of the group's
activity.

Groups you never visit show no such information, only the (sometimes
estimated) total article count. It is possible to have the server visit
every group, but that would mean extra calls; not in the current design.

The listing can be done oldest-first: use `?start=1` or any positive number.
The requested number will be constrained to the range reported by the
server.

If you go Back to the group list, it doesn't always update. Need to figure
out why. You may of course refresh manually.

#### Articles

Click the article title to read.

There is currently no navigation between articles; go Back to the list. The
URL to the article is a direct perma-link, and there is no extra work done
to determine adjacent articles.

Images embedded in the article, and links to downloadable attachments are at
the bottom. The presence of at least one image or attachment is noted in the
top right.

#### Posting

Not yet. Maybe next.

#### Timeout

All NNTP operations must complete within a hard-coded limit of 7.5 seconds.
If not, some kind of blank/error is returned. This was added because during
early development, the test news server went offline. Instead of waiting 20
seconds to get nothing, a shorter limit is enforced. This may be
configurable in the future.

## Why?

I was active on a non-Usenet news server, operated by a software company for
product support. Eventually my participation waned, but I still lurk.

For some time, I have been using [Unison](http://www.panic.com/unison/). The
fact that it was discontinued in 2014, and that more recent versions of
macOS have some compatibility issues was not directly a factor. It was that
I repurposed the old Mac running an old Mac OS X to Linux (as I try
different distros, this one is Ubuntu Budgie), making the app inaccessible.
It's still there on the HFS+ partition.

Developing this replacement has caused me to lurk more frequently, just to
test.

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

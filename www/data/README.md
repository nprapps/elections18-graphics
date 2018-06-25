The JSON files in this directory (but _not_ the JSON files within the `extra_data` subdirectory) are for static development, and may be overwritten when running the _back-end_ daemon. Such file changes should generally not be checked in, as they would clutter the Git history.

[This policy of ignoring changes to already-Git-tracked can be enforced using a Git setting](https://stackoverflow.com/a/39776107), which only affects your local machine; when a new developer clones the repo, they would have to make the changes themselves. (This is for the best since it reduces confusion, as this setting has significant effects and is quite opaque.)

```bash
git update-index --skip-worktree \
	"www/data/??.json" \
	"www/data/*-national.json" \
	"www/data/top-level-results.json"
```

To view which files are locally ignored for updating, you can run:

```bash
git ls-files -v . | grep ^S
```

And to _allow_ changes to these files in your local Git, you can run:

```bash
git update-index --no-skip-worktree "${YOUR_DESIRED_FILES}"
```

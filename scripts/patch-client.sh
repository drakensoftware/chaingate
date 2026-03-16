#!/usr/bin/env bash
# Post-generation patches for the auto-generated API client.
# Run automatically by `npm run build-client`.

set -euo pipefail

CLIENT_DIR="src/Client"
CLIENT_FILE="$CLIENT_DIR/client/client.gen.ts"

# 1. Strip @ts-expect-error directives injected by the code generator
sed -i '/@ts-expect-error/d' "$CLIENT_DIR"/**/*.ts

# 2. Disable eslint no-explicit-any in generated files that use `any`
for f in \
  "$CLIENT_DIR/client/client.gen.ts" \
  "$CLIENT_DIR/core/bodySerializer.gen.ts" \
  "$CLIENT_DIR/core/serverSentEvents.gen.ts"
do
  sed -i '1i\/* eslint-disable @typescript-eslint/no-explicit-any */' "$f"
done

# 3. Format & lint
npx prettier --write "$CLIENT_DIR"
npx eslint --fix "$CLIENT_DIR"

# 4. Suppress the StreamEvent generic variance error on beforeRequest()
#    (the generated `request` function passes options whose StreamEvent<TData>
#    is not assignable to StreamEvent<unknown>)
sed -i "/Client\['request'\]/a\\    // @ts-expect-error - generated client type mismatch with StreamEvent generic" "$CLIENT_FILE"

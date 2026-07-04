---
*** Begin Patch
*** Update File: src/game/engine.ts
@@
-  const myPieces = match.pieces?.[role] || [-1, -1, -1, -1];
-  const oppPieces = match.pieces?.[role === 'host' ? 'guest' : 'host'] || [-1, -1, -1, -1];
+  const myPieces = match.pieces?.[role] ?? Array(2).fill(-1);
+  const oppPieces = match.pieces?.[role === 'host' ? 'guest' : 'host'] ?? Array(2).fill(-1);
@@
-    for (let pIdx = 0; pIdx < 4; pIdx++) {
-      const curPos = myPieces[pIdx];
+    for (let pIdx = 0; pIdx < myPieces.length; pIdx++) {
+      const curPos = myPieces[pIdx];
@@
-  const myPieces = [...(match.pieces?.[role] || [-1, -1, -1, -1])];
-  const oppPieces = [...(match.pieces?.[role === 'host' ? 'guest' : 'host'] || [-1, -1, -1, -1])];
+  const myPieces = [...(match.pieces?.[role] ?? Array(2).fill(-1))];
+  const oppPieces = [...(match.pieces?.[role === 'host' ? 'guest' : 'host'] ?? Array(2).fill(-1))];
*** End Patch

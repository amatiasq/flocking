# 2026-08-03 — The three import-review fixes are in

#1 landed with the quadtree — a frozen spatial index and a half-shared frame
cannot both be right:
[the quadtree decision](../../../.agents/decisions/2026-08-03%20quadtree-in-flocking-and-lulas.md).

**#3 — `solidBody` resolves one cell, itself, by half the overlap**, and writes
nothing to `other`. It used to push both members and swap velocities, so a pair
was resolved twice and half that work corrupted the frame everyone else was
reading. The plan asked for the *full* overlap: two cells each moving half end
up touching, and full turns every graze into a bounce. Left unfixed on purpose:
a cell overlapping **two** neighbours keeps whichever velocity it looked at
last, and two cells at exactly the same position never separate, since
`normalize` of a zero vector is zero.

**#4 — `CellId` is a branded number**, was a string literal type with a number
arriving through `as any`. `Color` keeps the string trick: there it really is one.

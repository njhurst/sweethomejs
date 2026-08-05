# Golden fixture corpus

Golden `.sh3d` files + reference outputs (Java field-dumps, plan/3D/photo PNGs,
`Home.xml` bytes, PDF/SVG exports) captured from the real Java app.

- `test/fixtures/dream_house.sh3d` (repo root `examples/`) is the first committed fixture
  (a real home with walls, rooms, furniture, cameras). Task 1.5 wires it into
  the corpus and captures its reference dumps/renders.
- Task 1.6 builds feature-covering fixtures (walls, rooms, furniture, levels,
  dims/labels, cameras, environment, damaged, big).

See docs/12-testing-and-parity.md for the full corpus spec.

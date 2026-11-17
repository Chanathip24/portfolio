# Team rules (apply to every agent)

1. **Mobile first.** Design and style for the smallest screen first, then scale up with min-width breakpoints. Verify at phone width before desktop.
2. **Maintainable code.** Small, readable, reuse existing components and helpers in `src/components` and `src/lib`. No speculative abstractions.
3. **Every new feature ships with tests.** A feature is not done without them.
4. **Missing tests on existing code become tickets, not blockers.** If you find untested code outside your task, add a ticket to `docs/sprint.md` (Backlog) instead of expanding scope.
5. **The team-manager runs the sprint.** Work is tracked in `docs/sprint.md`; only the manager moves tickets between columns. Other agents report findings to the manager, who files tickets.
6. **Teams.** Product (product-manager -> ui-ux-designer), feature (software-engineer), platform (performance-a11y-engineer). staff-engineer approves every plan and diff before testing.
7. **Branches.** One branch per feature, `feat/<ticket>-<slug>`. Never commit to main. Use conventional commits, push to origin, and open a draft PR once the tests pass.
8. **Token budget.** Reports are at most 250 words plus one table; details go in files. Read only what you need. During work, run only the affected tests; run the full suite once before push.

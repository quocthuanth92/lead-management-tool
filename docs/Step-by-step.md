# Các bước thực hiện
## Xây dựng kiến trúc dự án
### Tạo project repo
1. Tạo các struct folder chính 
2. Tích hợp spec-kit from https://github.com/github/spec-kit
3. Cài đặt các instructions and skills cần thiết từ https://awesome-copilot.github.com/
4. Cài đặt các skills từ https://skillsmp.com/, https://github.com/mongodb/agent-skills
## Use Spec Kit
1. input constitution
`The development standards for this repository are as follows:
Architecture Principles
- The authoritative architecture rules live in docs\system-design-architecture.md
- Clean Architecture: Code is organized into modular, reusable components with clear separation of concerns between the frontend and the backend .
- All new work must respect current hexagonal boundaries and port placement rules.
AI-First Workflow
- Verify before modification. Do not assume files, classes, or dependencies.
Development Rules
- Code must be formatted, linted, and free of TypeScript errors before committing.
- When implementing a specific layer of the tech stack, fetch the relevant skills first, then generate the code.
Testing Policy
- Tests are required for behavior changes in domain or application layers.
- Integration tests are required for REST, persistence, or security changes.

`

2. 
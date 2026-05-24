import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter.ts";

describe("parseFrontmatter", () => {
  it("returns empty data and original input when no delimiter is present", () => {
    const { data, body } = parseFrontmatter("just body text");
    expect(data).toEqual({});
    expect(body).toBe("just body text");
  });

  it("returns empty data when the closing delimiter is missing", () => {
    const input = "---\nname: x\nbody without close";
    const { data, body } = parseFrontmatter(input);
    expect(data).toEqual({});
    expect(body).toBe(input);
  });

  it("parses simple key:value pairs", () => {
    const input = "---\nname: alpha\ndescription: hello world\n---\nBody";
    const { data, body } = parseFrontmatter(input);
    expect(data).toEqual({ name: "alpha", description: "hello world" });
    expect(body).toBe("Body");
  });

  it("preserves colons inside the value (only splits on the first colon)", () => {
    const input = '---\ndescription: use "key: value" pairs here\n---\n';
    const { data } = parseFrontmatter(input);
    expect(data["description"]).toBe('use "key: value" pairs here');
  });

  it("strips surrounding matching quotes", () => {
    const input = `---\na: "quoted"\nb: 'single'\nc: mixed"\n---\n`;
    const { data } = parseFrontmatter(input);
    expect(data["a"]).toBe("quoted");
    expect(data["b"]).toBe("single");
    expect(data["c"]).toBe('mixed"');
  });

  it("skips comment lines and blank lines inside the block", () => {
    const input = "---\n# a comment\n\nname: bravo\n---\n";
    const { data } = parseFrontmatter(input);
    expect(data).toEqual({ name: "bravo" });
  });

  it("ignores lines without a colon and lines with invalid keys", () => {
    const input = "---\nnocolon\n123bad: value\nokay: yes\n---\n";
    const { data } = parseFrontmatter(input);
    expect(data).toEqual({ okay: "yes" });
  });

  it("handles CRLF line endings", () => {
    const input = "---\r\nname: x\r\n---\r\nbody";
    const { data, body } = parseFrontmatter(input);
    expect(data).toEqual({ name: "x" });
    expect(body).toBe("body");
  });
});

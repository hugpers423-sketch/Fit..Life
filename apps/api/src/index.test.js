import request from "supertest";

describe("API Health", () => {
  it("should return ok", async () => {
    const res = await request("http://localhost:3001").get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

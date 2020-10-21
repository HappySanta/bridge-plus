import {Queue} from "../Queue";
import {delay} from "../helpers";


describe("queue", () => {
  it("work fine", async (done) => {
    let result = ""
    const q = new Queue()
    const q1 = q.call( async () => {
      await delay(30)
      result += "f"
    } )

    const q2 = q.call( async () => {
      await delay(20)
      result += "i"
    } )

    const q3 = q.call( async () => {
      await delay(10)
      result += "n"
    } )

    const q4 = q.call( async () => {
      await delay(5)
      result += "e"
    } )

    await Promise.all([q1,q2,q3,q4])
    expect(result).toBe('fine')
    done()
  })

  it("work with throws", async (done) => {
    const q = new Queue()

    const q1 = q.call(async () => {
      await delay(10)
      return "T"
    })

    const q2 = q.call(async () => {
      await delay(20)
      throw new Error("fake.exception")
    }).catch(e => "F")

    const q3 = q.call(async () => {
      await delay(5)
      return 'T'
    })

    const res = await Promise.all([q1,q2,q3])

    expect(res.join(".")).toBe("T.F.T")

    done()
  })

  it("call as expect", async done => {
    const q = new Queue()
    let res = ""
    const q1 = q.call(async () => {
      await delay(5)
      res += "Q1"
    })

    const q2 = q.call(async () => {
      await delay(5)
      res += "Q2"
    })

    expect(res).toBe("")
    await q1
    expect(res).toBe("Q1")
    await delay(1)
    expect(res).toBe("Q1")
    await q2
    expect(res).toBe("Q1Q2")
    done()
  })
})

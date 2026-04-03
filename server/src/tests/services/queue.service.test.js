const { joinQueue, leaveQueue, getQueue } = require("../../services/queue.service");
const Queue = require("../../models/Queue.model");
const Company = require("../../models/Company.model");
const Student = require("../../models/Student.model");
const { getIO } = require("../../config/socket");

jest.mock("../../models/Queue.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/Student.model");
jest.mock("../../config/socket", () => ({
    getIO: jest.fn().mockReturnValue({
        emit: jest.fn(),
        to: jest.fn().mockReturnThis()
    })
}));

describe("Queue Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("joinQueue", () => {
        test("throws Error if company not found", async () => {
            Company.findById.mockResolvedValue(null);
            await expect(joinQueue("stu1", "comp1")).rejects.toThrow("Company not found");
        });

        test("adds student to queue if shortlisted", async () => {
            Company.findById.mockResolvedValue({ _id: "comp1" });
            Student.findById.mockResolvedValue({ 
                _id: "stu1", 
                shortlistedCompanies: ["comp1"],
                name: "Test" 
            });
            Queue.findOne.mockResolvedValue(null); // No existing queue for THIS company
            Queue.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue([]) // No conflicting active queues
            }); 
            const entry = { _id: "queue1", status: "PENDING" };
            Queue.create.mockResolvedValue(entry);

            const result = await joinQueue("stu1", "comp1");
            expect(result.status).toBe("PENDING");
            expect(Queue.create).toHaveBeenCalledWith(expect.objectContaining({
                companyId: "comp1",
                studentId: "stu1",
                status: "PENDING"
            }));
        });

        test("duplicate student logic throws error", async () => {
            Company.findById.mockResolvedValue({ _id: "comp1" });
            Student.findById.mockResolvedValue({ 
                _id: "stu1", 
                shortlistedCompanies: ["comp1"] 
            });
            Queue.findOne.mockResolvedValue({ _id: "existing_queue", status: "PENDING" }); // Existing queue for same company
            
            await expect(joinQueue("stu1", "comp1")).rejects.toThrow("You already have an active request for this round");
        });
    });

    describe("leaveQueue", () => {
        test("throws error if no active queue", async () => {
            Queue.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });
            await expect(leaveQueue("stu1", "comp1")).rejects.toThrow("No active queue entry found for this company");
        });

        test("soft deletes (EXITED) and reorders remaining positions", async () => {
            const entry1 = { _id: "q1", position: 1, round: "Round 1", status: "in_queue", save: jest.fn() };
            Queue.find.mockReturnValueOnce({
                sort: jest.fn().mockResolvedValue([entry1]) // the entry being left
            });

            // The remaining entries below it
            const entry2 = { _id: "q2", position: 2, save: jest.fn().mockResolvedValue(true) };
            Queue.find.mockReturnValueOnce({
                sort: jest.fn().mockResolvedValue([entry2]) // trailing
            });
            
            Queue.updateMany.mockResolvedValue({});
            
            await leaveQueue("stu1", "comp1");
            expect(Queue.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ["q1"] } },
                { $set: { status: expect.any(String), completedAt: expect.any(Date) } }
            );
            expect(entry2.position).toBe(1); // It gets reordered (decremented)
            expect(entry2.save).toHaveBeenCalled();
        });
    });

    describe("getQueue", () => {
        test("returns correctly ordered list", async () => {
            const mockedList = [
                { studentId: "s1", position: 1 },
                { studentId: "s2", position: 2 }
            ];
            Queue.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            sort: jest.fn().mockResolvedValue(mockedList)
                        })
                    })
                })
            });

            const result = await getQueue("comp1");
            expect(result).toHaveLength(2);
            expect(result[0].position).toBe(1);
            expect(result[1].position).toBe(2);
        });

        test("returns empty array for empty queue", async () => {
            Queue.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            sort: jest.fn().mockResolvedValue([])
                        })
                    })
                })
            });

            const result = await getQueue("empty_comp");
            expect(result).toEqual([]);
        });
    });
});

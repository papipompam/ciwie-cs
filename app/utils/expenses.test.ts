import { describe, expect, it } from 'vitest'
import { calculateExpenseTotal, calculateSupervisionLineExpense, createExpenseCalculation, createExpenseRecord, normalizeExpensePreview } from './expenses'

describe('expense calculation', () => {
  it('แยกห้องพักอาจารย์ชายและหญิงแม้จำนวนรวมจะพักห้องเดียวได้', () => {
    const result = calculateSupervisionLineExpense({
      fuel: 1000,
      roomRate: 1200,
      nights: 2,
      allowanceRate: 500,
      allowanceDays: 2,
      roomCapacity: 2,
    }, [
      { id: 'LECTURER-M-1', gender: 'male' },
      { id: 'LECTURER-F-1', gender: 'female' },
    ])

    expect(result).toEqual({
      lecturerCount: 2,
      maleLecturerCount: 1,
      femaleLecturerCount: 1,
      maleRoomCount: 1,
      femaleRoomCount: 1,
      roomCount: 2,
      amounts: { fuel: 1000, accommodation: 4800, allowance: 2000 },
      total: 7800,
    })
  })

  it('ไม่คำนวณเมื่ออาจารย์ในสายยังไม่มีข้อมูลเพศ', () => {
    expect(() => calculateSupervisionLineExpense({
      fuel: 0,
      roomRate: 1000,
      nights: 1,
      allowanceRate: 0,
      allowanceDays: 1,
      roomCapacity: 2,
    }, [{ id: 'LECTURER-UNKNOWN', gender: null }])).toThrow('LECTURER_GENDER_REQUIRED')
  })

  it('รวมค่าน้ำมัน ค่าที่พัก และเบี้ยเลี้ยงเป็นยอดค่าใช้จ่ายทั้งหมด', () => {
    expect(calculateExpenseTotal({ fuel: 1250.50, accommodation: 1800, allowance: 900 })).toBe(3950.50)
  })

  it('คงรายการที่ถูกต้องไว้เมื่อมีค่าใช้จ่ายบางรายการไม่ถูกต้อง', () => {
    expect(normalizeExpensePreview({ fuel: 100, accommodation: -1, allowance: 200 })).toEqual({
      fuel: 100,
      accommodation: 0,
      allowance: 200,
    })
  })

  it('ผูกผลคำนวณกับรอบและครั้งที่นิเทศที่เลือก', () => {
    expect(createExpenseCalculation(
      { cycleId: 'CYCLE-2569-2', round: 2 },
      { fuel: 1000, accommodation: 1500, allowance: 500 },
    )).toEqual({
      reference: { cycleId: 'CYCLE-2569-2', round: 2 },
      amounts: { fuel: 1000, accommodation: 1500, allowance: 500 },
      total: 3000,
    })
  })

  it('สร้างรายการประวัติพร้อมผู้บันทึกและวันเวลา', () => {
    const calculation = createExpenseCalculation(
      { cycleId: 'CYCLE-2569-2', round: 1 },
      { fuel: 800, accommodation: 1200, allowance: 500 },
    )

    expect(createExpenseRecord(calculation, {
      id: 'EXP-001',
      createdAt: '2026-09-07T10:30:00.000Z',
      createdBy: 'เจ้าหน้าที่ทดสอบ',
    })).toEqual({
      id: 'EXP-001',
      reference: { cycleId: 'CYCLE-2569-2', round: 1 },
      amounts: { fuel: 800, accommodation: 1200, allowance: 500 },
      total: 2500,
      createdAt: '2026-09-07T10:30:00.000Z',
      createdBy: 'เจ้าหน้าที่ทดสอบ',
    })
  })
})

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as faceapi from 'face-api.js';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class AttendanceComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  
  scanning = false;
  scanStatus: 'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAIL' = 'IDLE';
  modelsLoaded = false;
  stream: MediaStream | null = null;

  // Mock selector for registering face (Admin)
  selectedEmployeeId = 1;
  employees: any[] = [];

  // For monthly summary
  summaryMonth = new Date().getMonth() + 1;
  summaryYear = new Date().getFullYear();
  summaryData: any[] = [];
  summaryLoading = false;
  summaryStats = { onTime: 0, late: 0, early: 0 };

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  async ngOnInit() {
    this.http.get<any[]>('http://localhost:8080/api/employees').subscribe({
      next: data => {
        this.employees = data;
        if (data && data.length > 0) {
          this.selectedEmployeeId = data[0].id;
          this.loadSummary();
        }
      },
      error: () => {}
    });
    await this.loadModels();
  }

  ngOnDestroy() {
    this.stopWebcam();
  }

  async loadModels() {
    try {
      const MODEL_URL = '/assets/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      this.modelsLoaded = true;
      this.startWebcam();
    } catch (err) {
      console.error('Error loading face-api models', err);
      this.snackBar.open('Lỗi tải mô hình AI. Vui lòng kiểm tra lại.', 'Đóng', { duration: 5000 });
    }
  }

  startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.stream = stream;
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      })
      .catch(err => {
        console.error('Webcam error', err);
        this.snackBar.open('Không thể truy cập camera.', 'Đóng', { duration: 5000 });
      });
  }

  stopWebcam() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async getFaceDescriptor(): Promise<Float32Array | null> {
    if (!this.videoElement) return null;
    const video = this.videoElement.nativeElement;
    
    // Detect single face
    const detection = await faceapi.detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor();
      
    if (!detection) return null;
    return detection.descriptor;
  }

  async registerFace() {
    if (!this.modelsLoaded) {
      this.snackBar.open('Đang tải mô hình AI, vui lòng đợi...', 'Đóng', { duration: 3000 });
      return;
    }
    
    this.scanStatus = 'SCANNING';
    const descriptor = await this.getFaceDescriptor();
    
    if (!descriptor) {
      this.scanStatus = 'FAIL';
      this.snackBar.open('⚠️ Không tìm thấy khuôn mặt! Hãy nhìn thẳng vào camera.', 'Đóng', { duration: 4000 });
      setTimeout(() => this.scanStatus = 'IDLE', 2500);
      return;
    }
    
    // Convert Float32Array to Array for JSON transmission
    const descriptorArray = Array.from(descriptor);
    
    this.http.post('http://localhost:8080/api/face-attendance/register', {
      employeeId: this.selectedEmployeeId,
      descriptor: descriptorArray
    }).subscribe({
      next: (res: any) => {
        this.scanStatus = 'SUCCESS';
        this.snackBar.open(`✅ ${res.message}`, 'Đóng', { duration: 4000 });
        
        // Cập nhật lại danh sách nhân viên để hiển thị trạng thái "Đã ĐK"
        this.http.get<any[]>('http://localhost:8080/api/employees').subscribe(data => {
            this.employees = data;
        });

        setTimeout(() => this.scanStatus = 'IDLE', 3000);
      },
      error: err => {
        this.scanStatus = 'FAIL';
        this.snackBar.open('⚠️ ' + (err.error?.message || err.message), 'Đóng', { duration: 5000 });
        setTimeout(() => this.scanStatus = 'IDLE', 3000);
      }
    });
  }

  async startScan(type: 'checkin' | 'checkout') {
    if (this.scanning || !this.modelsLoaded) return;
    this.scanStatus = 'SCANNING';
    this.scanning = true;

    try {
      const descriptor = await this.getFaceDescriptor();
      
      if (!descriptor) {
        this.scanning = false;
        this.scanStatus = 'FAIL';
        this.snackBar.open('⚠️ Không tìm thấy khuôn mặt. Hãy nhìn thẳng vào camera.', 'Đóng', { duration: 4000 });
        setTimeout(() => this.scanStatus = 'IDLE', 2500);
        return;
      }
      
      const endpoint = type === 'checkin'
        ? `http://localhost:8080/api/face-attendance/check-in`
        : `http://localhost:8080/api/face-attendance/check-out`;

      this.http.post(endpoint, { descriptor: Array.from(descriptor) }).subscribe({
        next: (res: any) => {
          this.scanning = false;
          this.scanStatus = 'SUCCESS';
          this.snackBar.open(`✅ ${res.message} - Xin chào ${res.employeeName}`, 'Đóng', { duration: 4000 });
          setTimeout(() => this.scanStatus = 'IDLE', 3000);
          this.loadSummary(); // Reload summary
        },
        error: err => {
          this.scanning = false;
          this.scanStatus = 'FAIL';
          this.snackBar.open('⚠️ ' + (err.error?.message || err.message), 'Đóng', { duration: 5000 });
          setTimeout(() => this.scanStatus = 'IDLE', 3000);
        }
      });
    } catch (error) {
       this.scanning = false;
       this.scanStatus = 'FAIL';
       this.snackBar.open('⚠️ Lỗi khi xử lý hình ảnh.', 'Đóng', { duration: 4000 });
       setTimeout(() => this.scanStatus = 'IDLE', 3000);
    }
  }

  loadSummary() {
    this.summaryLoading = true;
    this.http.get<any[]>(
      `http://localhost:8080/api/attendance/${this.selectedEmployeeId}/monthly?month=${this.summaryMonth}&year=${this.summaryYear}`
    ).subscribe({
      next: data => {
        this.summaryData = data;
        this.summaryStats.onTime = data.filter(d => !this.isRowLate(d) && !this.isRowEarly(d) && d.status !== 'ABSENT' && d.status !== 'ABSENT_NO_PERMISSION' && d.status !== 'SPECIAL_LEAVE').length;
        this.summaryStats.late = data.filter(d => this.isRowLate(d)).length;
        this.summaryStats.early = data.filter(d => this.isRowEarly(d)).length;
        this.summaryLoading = false;
      },
      error: () => {
        this.summaryLoading = false;
        this.snackBar.open('Chưa có dữ liệu chấm công tháng này.', 'Đóng', { duration: 3000 });
      }
    });
  }

  getSelectedEmployeeName(): string {
    const emp = this.employees.find(e => e.id === Number(this.selectedEmployeeId));
    return emp ? emp.name : '—';
  }

  timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
  }

  isRowLate(row: any): boolean {
    if (!row || !row.checkInTime || !row.shift || !row.shift.startTime) return false;
    if (row.status === 'ABSENT' || row.status === 'ABSENT_NO_PERMISSION' || row.status === 'SPECIAL_LEAVE') return false;
    const checkInMin = this.timeToMinutes(row.checkInTime);
    const shiftStartMin = this.timeToMinutes(row.shift.startTime);
    return checkInMin - shiftStartMin > 10;
  }

  isRowEarly(row: any): boolean {
    if (!row || !row.checkOutTime || !row.shift || !row.shift.endTime) return false;
    if (row.status === 'ABSENT' || row.status === 'ABSENT_NO_PERMISSION' || row.status === 'SPECIAL_LEAVE') return false;
    const checkOutMin = this.timeToMinutes(row.checkOutTime);
    const shiftEndMin = this.timeToMinutes(row.shift.endTime);
    return checkOutMin < shiftEndMin;
  }
}

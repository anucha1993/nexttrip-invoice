@extends('layouts.template')
@section('content')
    <style>
        body,
        .page-content,
        .container,
        .form-control,
        .form-select,
        .select2-selection {
            font-family: 'Sarabun', 'Prompt', 'Segoe UI', sans-serif;
        }

        .container.border.bg-white {
            background: #f7fafd;
            border-radius: 18px;
            box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.07);
            padding: 32px 28px 24px 28px;
            margin-top: 24px;
        }

        .section-card {
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 1px 8px 0 rgba(25, 118, 210, 0.07);
            margin-bottom: 28px;
            padding: 24px 18px 18px 18px;
            border-top: 5px solid #1976d2;
            position: relative;
        }

        .section-card .section-title {
            font-size: 1.18rem;
            font-weight: 700;
            margin-bottom: 18px;
            color: #fff;
            background: linear-gradient(90deg, #1976d2 60%, #42a5f5 100%);
            border-radius: 8px 8px 8px 8px;
            padding: 10px 18px 10px 44px;
            position: relative;
            box-shadow: 0 2px 8px 0 rgba(25, 118, 210, 0.08);
            letter-spacing: 0.5px;
        }

        .section-title .fa {
            position: absolute;
            left: 16px;
            top: 13px;
            font-size: 1.2em;
            opacity: 0.85;
        }

        .divider {
            border: none;
            border-top: 2px dashed #90caf9;
            margin: 24px 0 18px 0;
        }

        h4,
        h5 {
            font-weight: 700;
            color: #1a237e;
            letter-spacing: 0.5px;
        }

        h5.section-inline {
            background: linear-gradient(90deg, #1976d2 60%, #42a5f5 100%);
            color: #fff !important;
            border-radius: 8px;
            padding: 7px 16px 7px 38px;
            margin-bottom: 18px;
            position: relative;
            font-size: 1.08rem;
        }

        h5.section-inline .fa {
            position: absolute;
            left: 14px;
            top: 10px;
            font-size: 1.1em;
            opacity: 0.85;
        }

        label {
            font-weight: 600;
            color: #222;
            margin-bottom: 4px;
        }

        .form-control,
        .form-select,
        .select2-selection {
            border-radius: 8px !important;
            border: 1.5px solid #d1d5db;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
            font-size: 1.08rem;
            padding: 10px 14px;
            background: #fafdff;
            transition: border 0.2s, box-shadow 0.2s;
        }

        .form-control:focus,
        .form-select:focus,
        .select2-selection:focus {
            border: 2px solid #42a5f5 !important;
            background: #fff;
            outline: none;
            box-shadow: 0 2px 8px 0 rgba(25, 118, 210, 0.13);
        }

        .form-control:focus,
        .form-select:focus,
        .select2-selection:focus {
            border: 1.5px solid #1976d2 !important;
            background: #fff;
            outline: none;
            box-shadow: 0 2px 8px 0 rgba(25, 118, 210, 0.07);
        }

        .select2-container--default .select2-selection--single {
            height: 38px;
            padding: 4px 8px;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            background: #fafbfc;
        }

        .select2-container--default .select2-selection--single .select2-selection__rendered {
            line-height: 30px;
        }

        .row.table-custom {
            margin-bottom: 18px;
        }
        /* Responsive: ปรับตารางรายการสินค้าให้แสดงแนวตั้งบนจอเล็ก */
        @media (max-width: 767.98px) {
            #quotation-table .header-row,
            #quotation-table .row.item-row {
                display: flex;
                flex-direction: column;
                align-items: stretch;
            }
            #quotation-table .header-row > div,
            #quotation-table .row.item-row > div {
                width: 100% !important;
                max-width: 100% !important;
                margin-bottom: 8px;
                text-align: left !important;
            }
            #quotation-table .header-row > div {
                font-size: 1rem;
                background: #e3f2fd;
                border-radius: 6px;
                margin-bottom: 2px;
                padding: 6px 8px;
            }
            #quotation-table .row.item-row > div {
                background: #fafdff;
                border-radius: 6px;
                padding: 6px 8px;
            }
            #quotation-table .row.item-row.table-discount > div {
                background: #fffbe7;
            }
            #quotation-table .row.item-row .btn-danger {
                width: 100%;
                margin-top: 6px;
            }
        }

        .header-row,
        .summary-row {
            background: #e3f2fd;
            border-radius: 8px;
            margin-bottom: 6px;
            padding: 8px 0;
            border-left: 4px solid #1976d2;
        }

        .header-row>div,
        .summary-row>div {
            font-weight: 600;
            color: #374151;
        }

        .item-row {
            background: #fafdff;
            border-radius: 10px;
            margin-bottom: 18px;
            box-shadow: 0 1px 4px 0 rgba(25, 118, 210, 0.04);
            transition: box-shadow 0.2s, background 0.2s;
            padding: 10px 0 10px 0;
        }

        .item-row.table-income {
            background: #fafdff;
        }

        .item-row.table-discount {
            background: #fffbe7;
        }

        .item-row:hover {
            box-shadow: 0 4px 16px 0 rgba(25, 118, 210, 0.13);
            background: #e3f2fd;
        }

        .item-row.table-discount:hover {
            background: #fff3c0;
        }

        .row.item-row>.row {
            margin-bottom: 10px;
        }

        .add-row {
            margin: 10px 0 10px 0;
            font-size: 1.08rem;
            color: #1976d2;
            cursor: pointer;
            font-weight: 500;
            display: flex;
            align-items: center;
            background: #e3f2fd;
            border-radius: 8px;
            padding: 7px 12px;
            width: fit-content;
            transition: background 0.2s;
        }

        .add-row:hover {
            background: #bbdefb;
            color: #0d47a1;
        }

        .add-row i {
            margin-right: 6px;
        }

        .btn-primary,
        .btn-danger,
        .btn-link {
            border-radius: 8px;
            font-weight: 600;
            font-size: 1.05rem;
            padding: 7px 18px;
            transition: background 0.2s, color 0.2s;
        }

        .btn-primary {
            background: linear-gradient(90deg, #1976d2 60%, #42a5f5 100%);
            border: none;
            color: #fff;
            box-shadow: 0 2px 8px 0 rgba(25, 118, 210, 0.08);
        }

        .btn-primary:hover {
            background: linear-gradient(90deg, #0d47a1 60%, #1976d2 100%);
            color: #fff;
        }

        .btn-danger {
            background: linear-gradient(90deg, #e53935 60%, #ff7043 100%);
            border: none;
            color: #fff;
        }

        .btn-danger:hover {
            background: linear-gradient(90deg, #b71c1c 60%, #e53935 100%);
            color: #fff;
        }

        .btn-link {
            color: #1976d2;
            text-decoration: underline;
            background: none;
            border: none;
        }

        .list-group-item,
        .period-select {
            border-radius: 6px !important;
            margin-bottom: 2px;
            transition: background 0.15s;
        }

        .list-group-item:hover,
        .period-select:hover {
            background: #e3f2fd !important;
            color: #1976d2;
        }

        .summary {
            background: #f8fafc;
            border-radius: 12px;
            padding: 18px 12px 10px 12px;
            box-shadow: 0 1px 8px 0 rgba(25, 118, 210, 0.07);
            border-left: 5px solid #1976d2;
        }

        #grand-total,
        #sum-include-vat {
            font-size: 1.18rem;
            font-weight: 700;
            color: #d84315;
            background: linear-gradient(90deg, #fff3e0 60%, #ffe0b2 100%);
            border-radius: 6px;
            padding: 2px 8px;
            box-shadow: 0 1px 4px 0 rgba(255, 152, 0, 0.07);
        }

        #pax {
            font-size: 1.08rem;
            color: #1976d2;
            font-weight: 600;
        }

        textarea.form-control {
            min-height: 60px;
            border-radius: 8px;
        }

        .input-group-text {
            background: #e3eafc;
            border-radius: 8px 0 0 8px;
            font-weight: 600;
            color: #1a237e;
        }

        .discount-row {
            background: #f9f9fb;
            border-radius: 8px;
            margin-bottom: 6px;
            box-shadow: 0 1px 4px 0 rgba(25, 118, 210, 0.04);
            border-left: 4px solid #42a5f5;
        }

        .discount-row .btn-danger {
            padding: 4px 10px;
            font-size: 1rem;
        }

        @media (max-width: 991px) {
            .container.border.bg-white {
                padding: 12px 4px 8px 4px;
            }

            .summary {
                padding: 10px 4px 6px 4px;
            }
        }
    </style>
    <div class="container-fluid page-content">
        <div class="todo-listing">
            <div class="container border bg-white">
                <h2 class="text-center my-4"><i class="fa fa-file-invoice-dollar"
                        style="color:#1976d2;margin-right:8px;"></i>สร้างใบเสนอราคา </h2>
                        
                <form action="{{ route('quote.store') }}" id="formQuoteModern" method="post">
                    @csrf
                    <div class="section-card">
                        <div class="section-title"><i class="fa fa-user-tie"></i> ข้อมูลทั่วไป</div>
                        <div class="row table-custom ">
                            <div class="col-md-2 ms-auto">
                                <label>เซลล์ผู้ขายแพคเกจ:</label>
                                <select name="quote_sale" class="form-select select2" required>
                                    @forelse ($sales as $item)
                                        <option value="{{ $item->id }}">{{ $item->name }}</option>
                                    @empty
                                        <option value="">--Select Sale--</option>
                                    @endforelse
                                </select>
                            </div>
                            <div class="col-md-2 ms-3">
                                <label>วันที่สั่งซื้อ/จองแพคเกจ:</label>
                                <input type="date" id="displayDatepicker" class="form-control" required
                                    value="{{ date('Y-m-d') }}">
                                <input type="hidden" id="submitDatepicker" name="quote_booking_create"
                                    value="{{ date('Y-m-d') }}">
                                {{-- <input type="hidden" id="quote-date" name="quote_booking_create"> --}}
                            </div>
                            <div class="col-md-2">
                                <label>เลขที่ใบเสนอราคา</label>
                                <input type="text" class="form-control" placeholder="???????" disabled>
                            </div>
                            <div class="col-md-2">
                                <label>วันที่เสนอราคา</label>
                                <input type="date" id="displayDatepickerQuoteDate" name="quote_date" class="form-control"
                                    required value="{{ date('Y-m-d') }}">

                            </div>
                        </div>
                    </div>
                    <hr class="divider">
                    <div class="section-card">
                        <div class="section-title" style="background:linear-gradient(90deg,#d84315 60%,#ff7043 100%)"><i
                                class="fa fa-suitcase-rolling"></i> รายละเอียดแพคเกจทัวร์</div>
                        <div class="row table-custom">
                            <div class="col-md-6 position-relative">
                                <label>ชื่อแพคเกจทัวร์:</label>
                                <input type="text" id="tourSearch" class="form-control" name="quote_tour_name"
                                    placeholder="ค้นหาแพคเกจทัวร์...ENTER เพื่อค้นหา" required autocomplete="off">
                                <button type="button" id="resetTourSearch"
                                    class="btn btn-link btn-sm position-absolute end-0 top-0"
                                    style="z-index:1100;right:10px;top:30px"><i class="fa fa-times"></i></button>
                                <div id="tourResults" class="list-group position-absolute w-100" style="z-index: 1000;">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <label for="">รหัสทัวร์ API <small class="text-danger">แก้ไขไม่ได้*</small></label>
                                <input type="text" id="tour-code" name="quote_tour" class="form-control" readonly
                                    style="background-color: #81c7844b">
                            </div>
                            <div class="col-md-3">
                                <label for="">รหัสทัวร์ กำหนดเอง </label>
                                <input type="text" name="quote_tour_code" class="form-control"
                                    placeholder="ว่างเพื่อใช้รหัสอัตโนมัติ">
                            </div>

                            <input type="hidden" id="tourSearch1" class="form-control" name="quote_tour_name1">

                            <input type="hidden" id="tour-id">
                            <div class="col-md-3">
                                <label>ระยะเวลาทัวร์ (วัน/คืน): </label>
                                <select name="quote_numday" class="form-select" id="numday" required>
                                    <option value="">--เลือกระยะเวลา--</option>
                                    @forelse ($numDays as $item)
                                        <option data-day="{{ $item->num_day_total }}" value="{{ $item->num_day_name }}">
                                            {{ $item->num_day_name }}</option>
                                    @empty
                                    @endforelse
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label>ประเทศที่เดินทาง: </label>
                                <select name="quote_country" class="form-select select2" id="country" style="width: 100%"
                                    required>
                                    <option value="">--เลือกประเทศที่เดินทาง--</option>
                                    @forelse ($country as $item)
                                        <option value="{{ $item->id }}">
                                            {{ $item->iso2 }}-{{ $item->country_name_th }}</option>
                                    @empty
                                    @endforelse
                                </select>
                            </div>


                            <div class="col-md-3">
                                <label>โฮลเซลล์: </label>
                                <select name="quote_wholesale" class="form-select select2" style="width: 100%"
                                    id="wholesale" required>
                                    <option value="">--เลือกโฮลเซลล์--</option>
                                    @forelse ($wholesale as $item)
                                        <option value="{{ $item->id }}">
                                            {{ $item->code }}-{{ $item->wholesale_name_th }}</option>
                                    @empty
                                    @endforelse
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label>สายการบิน:</label>
                                <select name="quote_airline" class="form-select select2" style="width: 100%"
                                    id="airline" required>
                                    <option value="">--เลือกสายการบิน--</option>
                                    @forelse ($airline as $item)
                                        <option value="{{ $item->id }}">{{ $item->code }}-{{ $item->travel_name }}
                                        </option>
                                    @empty
                                    @endforelse
                                </select>
                            </div>
                            <div class="col-md-3 position-relative">
                                <label>วันออกเดินทาง: <a href="javascript:void(0);" id="list-period"
                                        style="color:#1976d2;font-weight:500;">เลือกวันที่</a></label>
                                <input type="date" class="form-control" id="date-start-display"
                                    placeholder="วันออกเดินทาง..." required autocomplete="off">
                                <div id="date-list" class="list-group position-absolute w-100" style="z-index: 1000;">
                                </div>
                                <input type="hidden" id="period1" name="period1">
                                <input type="hidden" id="period2" name="period2">
                                <input type="hidden" id="period3" name="period3">
                                <input type="hidden" id="period4" name="period4">
                                <input type="hidden" id="date-start" name="quote_date_start">
                            </div>
                            <div class="col-md-3">
                                <label>วันเดินทางกลับ: </label>
                                <input type="date" class="form-control" id="date-end-display"
                                    placeholder="วันเดินทางกลับ..." required>
                                <input type="hidden" id="date-end" name="quote_date_end">
                            </div>
                        </div>
                    </div>
                    <hr class="divider">
                    <div class="section-card">
                        <div class="section-title" style="background:linear-gradient(90deg,#43a047 60%,#81c784 100%)"><i
                                class="fa fa-users"></i> ข้อมูลลูกค้า</div>
                        <div class="row table-custom">
                            <div class="col-md-3 position-relative">
                                <label class="">ชื่อลูกค้า:</label>
                                <input type="text" class="form-control" name="customer_name" id="customerSearch"
                                    placeholder="ชื่อลูกค้า...ENTER เพื่อค้นหา" required aria-describedby="basic-addon1"
                                    autocomplete="off">
                                <div id="customerResults" class="list-group position-absolute w-100"
                                    style="z-index: 1000;"></div>
                            </div>
                            <input type="hidden" id="customer-id" name="customer_id">
                            <input type="hidden" id="customer-new" name="customer_type_new" value="customerNew">
                            <div class="col-md-3">
                                <label>อีเมล์:</label>
                                <input type="email" class="form-control" name="customer_email" placeholder="Email"
                                    aria-describedby="basic-addon1" id="customer_email">
                            </div>
                            <div class="col-md-3">
                                <label>เลขผู้เสียภาษี:</label>
                                <input type="text" id="texid" class="form-control" name="customer_texid"
                                    mix="13" placeholder="เลขประจำตัวผู้เสียภาษี" aria-describedby="basic-addon1">
                            </div>
                            <div class="col-md-3">
                                <label>เบอร์โทรศัพท์ :</label>
                                <input type="text" class="form-control" name="customer_tel" id="customer_tel"
                                    placeholder="เบอร์โทรศัพท์" aria-describedby="basic-addon1">
                            </div>
                            <div class="col-md-12">
                                <div class="row">
                                    <div class="col-md-3">
                                        <div class="col-md-12">
                                            <label>เบอร์โทรสาร :</label>
                                            <input type="text" class="form-control" id="fax"
                                                name="customer_fax" placeholder="เบอร์โทรศัพท์"
                                                aria-describedby="basic-addon1">
                                        </div>
                                        <div class="col-md-12">
                                            <label>ลูกค้าจาก :</label>
                                            <select name="customer_campaign_source" class="form-select">
                                                @forelse ($campaignSource as $item)
                                                    <option value="{{ $item->campaign_source_id }}">
                                                        {{ $item->campaign_source_name }}</option>
                                                @empty
                                                @endforelse
                                            </select>
                                        </div>
                                        <div class="col-md-12">
                                            <label>Social id</label>
                                            <input type="text" class="form-control" name="customer_social_id"
                                                placeholder="Social id">
                                        </div>
                                    </div>
                                    <div class="col-md-9">
                                        <div class="col-md-12">
                                            <label>ที่อยู่:</label>
                                            <textarea name="customer_address" class="form-control" id="customer_address" cols="30" rows="7"
                                                placeholder="ที่อยู่"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <hr class="divider">
                    <div class="section-card">
                        <h5 class="section-inline"><i class="fa fa-coins"></i> ข้อมูลค่าบริการ <span id="pax"
                                class="float-end"></span></h5>
                        <div id="quotation-table" class="table-custom text-center">
                            <div class="row header-row d-none d-md-flex" style="padding: 5px">
                                <div class="col-md-1">ลำดับ</div>
                                <div class="col-md-3">รายการสินค้า</div>
                                <div class="col-md-1">รวม 3%</div>
                                <div class="col-md-1">NonVat</div>
                                <div class="col-md-1">จำนวน</div>
                                <div class="col-md-2">ราคา/หน่วย</div>
                                <div class="col-md-2">ยอดรวม</div>
                            </div>
                            <!-- Mobile header -->
                            <div class="row header-row d-flex d-md-none" style="padding: 5px">
                                <div>ลำดับ | รายการ | 3% | NonVat | จำนวน | ราคา/หน่วย | ยอดรวม</div>
                            </div>
                            <hr>
                            {{-- <div class="row discount-row mb-1 align-items-center" data-row-id="${rowId}" style="background:#fffbe7;border-radius:8px;padding:8px 0;"> --}}
                            {{-- <div class="row item-row table-income" id="table-income" style="background:#55ffb848;border-radius:8px;padding:8px 0;">
                        <div class="row align-items-center row item-row"> --}}

                            <div id="table-income" style="background:#55ffb848;border-radius:8px;padding:8px 0;">
                                <!-- Desktop row -->
                                <div class="row item-row table-income align-items-center d-none d-md-flex">
                                    <div class="col-md-1 "><span class="row-number"></span></div>
                                    <div class="col-md-3">
                                        <select name="product_id[]" class="form-select product-select select2"
                                            id="product-select" style="width: 100%;">
                                            <option value="">--เลือกสินค้า--</option>
                                            @forelse ($products as $product)
                                                <option @if (189 === $product->id) selected @endif
                                                    data-pax="{{ $product->product_pax }}" value="{{ $product->id }}">
                                                    {{ $product->product_name }}{{ $product->product_pax === 'Y' ? '(Pax)' : '' }}
                                                </option>
                                            @empty
                                            @endforelse
                                        </select>
                                    </div>
                                    <!-- dropdown ประเภท (รายได้/ส่วนลด) ซ่อนแบบต้นฉบับ -->
                                    <div class="col-md-1" style="display: none">
                                        <select name="expense_type[]" class="form-select">
                                            <option selected value="income"> รายได้ </option>
                                        </select>
                                    </div>
                                    <div class="col-md-1">
                                        <input type="hidden" name="withholding_tax[]" value="N">
                                        <input type="checkbox" name="withholding_tax[]" class="vat-3" value="Y">
                                    </div>
                                    <div class="col-md-1 text-center">
                                        <select name="vat_status[]" class="vat-status form-select" style="width: 110%;">
                                            <option selected value="nonvat">nonVat</option>
                                            <option value="vat">Vat</option>
                                        </select>
                                    </div>
                                    <div class="col-md-1"><input type="number" name="quantity[]"
                                            class="quantity form-control text-end" step="1" value="1"></div>
                                    <div class="col-md-2"><input type="number" name="price_per_unit[]"
                                            class="price-per-unit form-control text-end period1" step="0.01"
                                            value="0"></div>
                                    <div class="col-md-2"><input type="number" name="total_amount[]"
                                            class="total-amount form-control text-end" value="0" readonly></div>
                                    <div class="col-md-1 text-center">
                                        <button type="button" class="btn btn-danger btn-sm remove-row-btn "
                                            title="ลบแถว" style="font-size: 13px 10px"><i
                                                class="fa fa-trash"></i></button>
                                    </div>
                                </div>
                                <!-- Mobile row -->
                                <div class="row item-row table-income align-items-center d-flex d-md-none" style="margin-bottom:12px;">
                                    <div><b>ลำดับ:</b> <span class="row-number"></span></div>
                                    <div><b>สินค้า:</b>
                                        <select name="product_id[]" class="form-select product-select select2"
                                            id="product-select-mobile" style="width: 100%;">
                                            <option value="">--เลือกสินค้า--</option>
                                            @forelse ($products as $product)
                                                <option @if (189 === $product->id) selected @endif
                                                    data-pax="{{ $product->product_pax }}" value="{{ $product->id }}">
                                                    {{ $product->product_name }}{{ $product->product_pax === 'Y' ? '(Pax)' : '' }}
                                                </option>
                                            @empty
                                            @endforelse
                                        </select>
                                    </div>
                                    <div style="display:none">
                                        <select name="expense_type[]" class="form-select">
                                            <option selected value="income"> รายได้ </option>
                                        </select>
                                    </div>
                                    <div><b>3%:</b> <input type="hidden" name="withholding_tax[]" value="N">
                                        <input type="checkbox" name="withholding_tax[]" class="vat-3" value="Y">
                                    </div>
                                    <div><b>NonVat:</b>
                                        <select name="vat_status[]" class="vat-status form-select" style="width: 100%;">
                                            <option selected value="nonvat">nonVat</option>
                                            <option value="vat">Vat</option>
                                        </select>
                                    </div>
                                    <div><b>จำนวน:</b> <input type="number" name="quantity[]"
                                            class="quantity form-control text-end" step="1" value="1"></div>
                                    <div><b>ราคา/หน่วย:</b> <input type="number" name="price_per_unit[]"
                                            class="price-per-unit form-control text-end period1" step="0.01"
                                            value="0"></div>
                                    <div><b>ยอดรวม:</b> <input type="number" name="total_amount[]"
                                            class="total-amount form-control text-end" value="0" readonly></div>
                                    <div>
                                        <button type="button" class="btn btn-danger btn-sm remove-row-btn "
                                            title="ลบแถว" style="font-size: 13px 10px;width:100%"><i
                                                class="fa fa-trash"></i></button>
                                    </div>
                                </div>
                            </div>

                            <div class="add-row">
                                <i class="fa fa-plus"></i><span id="add-row-service" style="cursor:pointer;">
                                    เพิ่มรายการ</span>
                            </div>
                            
                            <hr>
                            <div class="row item-row" style="border-radius:8px;padding:8px 0;">
                                <div class="row item-row table-discount">
                                    <div class="col-md-12" style="text-align: left">
                                        <label class="text-danger">ส่วนลด</label>
                                        <div id="discount-list">
                                            <!-- Discount rows will be rendered here by JS -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="add-row">
                                <i class="fa fa-plus"></i><span id="add-row-discount" style="cursor:pointer;">
                                    เพิ่มส่วนลด</span>
                            </div>
                        </div>
                    </div>
                    <hr class="divider">
                    <div class="section-card">
                        <div class="section-title" style="background:linear-gradient(90deg,#1976d2 60%,#42a5f5 100%)"><i
                                class="fa fa-calculator"></i> สรุปยอดและ VAT</div>
                        <div class="row">
                            <div class="col-6">
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label for="vat-method">การคำนวณ VAT:</label>
                                            <div>
                                                <input type="radio" id="vat-include" name="vat_type" value="include"
                                                    checked>
                                                <label for="vat-include">คำนวณรวมกับราคาสินค้าและบริการ (VAT
                                                    Include)</label>
                                            </div>
                                            <div>
                                                <input type="radio" id="vat-exclude" name="vat_type" value="exclude">
                                                <label for="vat-exclude">คำนวณแยกกับราคาสินค้าและบริการ (VAT
                                                    Exclude)</label>
                                            </div>
                                        </div>
                                        <hr>
                                    </div>
                                    <div class="col-md-12">
                                        <div class="row summary-row">
                                            <div class="col-md-10">
                                                <input type="checkbox" name="quote_withholding_tax_status" value="Y"
                                                    id="withholding-tax"> <span class="">คิดภาษีหัก ณ ที่จ่าย 3%
                                                    (คำนวณจากยอด ราคาก่อนภาษีมูลค่าเพิ่ม / Pre-VAT Amount)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md012">
                                        <label>จำนวนเงินภาษีหัก ณ ที่จ่าย 3% : &nbsp;</label><span class="text-danger"
                                            id="withholding-amount"> 0.00</span> บาท
                                        <hr>
                                    </div>
                                    <div class="col-md-12" style="padding-bottom: 10px">
                                        <label>บันทึกเพิ่มเติม</label>
                                        <textarea name="quote_note" class="form-control" cols="30" rows="2"></textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="row">
                                    <div class="summary text-info">
                                        <div class="row summary-row ">
                                            <div class="col-md-10 text-end">ยอดรวมยกเว้นภาษี / Vat-Exempted Amount</div>
                                            <div class="col-md-2 text-end"><span id="sum-total-nonvat">0.00</span></div>
                                        </div>
                                        <div class="row summary-row ">
                                            <div class="col-md-10 text-end">ราคาสุทธิสินค้าที่เสียภาษี / Pre-Tax Amount:
                                            </div>
                                            <div class="col-md-2 text-end"><span id="sum-total-vat">0.00</span></div>
                                        </div>
                                        <div class="row summary-row">
                                            <div class="col-md-10 text-end">ส่วนลด / Discount :</div>
                                            <div class="col-md-2 text-end"><span id="sum-discount">0.00</span></div>
                                        </div>
                                        <div class="row summary-row">
                                            <div class="col-md-10 text-end">ราคาก่อนภาษีมูลค่าเพิ่ม / Pre-VAT Amount:</div>
                                            <div class="col-md-2 text-end"><span id="sum-pre-vat">0.00</span></div>
                                        </div>
                                        <div class="row summary-row">
                                            <div class="col-md-10 text-end">ภาษีมูลค่าเพิ่ม VAT : 7%:</div>
                                            <div class="col-md-2 text-end"><span id="vat-amount">0.00</span></div>
                                        </div>
                                        <div class="row summary-row ">
                                            <div class="col-md-10 text-end">ราคารวมภาษีมูลค่าเพิ่ม / Include VAT:</div>
                                            <div class="col-md-2 text-end"><span id="sum-include-vat">0.00</span></div>
                                        </div>
                                        <div class="row summary-row">
                                            <div class="col-md-10 text-end">จำนวนเงินรวมทั้งสิ้น / Grand Total:</div>
                                            <div class="col-md-2 text-end"><b><span class="bg-warning"
                                                        id="grand-total">0.00</span></b></div>
                                        </div>
                                    </div>
                                </div>
                                <br>
                            </div>
                        </div>
                    </div>
                    <hr class="divider">
                    <div class="section-card">
                        <div class="section-title"
                            style="background:linear-gradient(90deg,#fbc02d 60%,#fff176 100%);color:#333;"><i
                                class="fa fa-hand-holding-usd"></i> เงื่อนไขการชำระเงิน</div>
                        <div class="row">
                            <div class="col-md-12">
                                <h5 style="color:#1976d2;">เงื่อนไขการชำระเงิน</h5>
                            </div>
                            <div class="col-md-12 ">
                                <div class="row">
                                    <div class="col-md-6">
                                        <input type="radio" name="quote_payment_type" id="quote-payment-deposit"
                                            value="deposit"> <label for="quote-payment-type"> เงินมัดจำ </label>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <div class="input-group mb-3">
                                                <span class="input-group-text" id="basic-addon1">ภายในวันที่</span>
                                                <input type="datetime-local" class="form-control"
                                                    name="quote_payment_date" id="quote-payment-date" value="">
                                                <input type="datetime-local" class="form-control"
                                                    name="quote_payment_date" id="quote-payment-date-new" value=""
                                                    style="display: none">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="input-group mb-3">
                                                <span class="input-group-text" for="">เรทเงินมัดจำ</span>
                                                <select name="quote_payment_price" class="form-select"
                                                    id="quote-payment-price">
                                                    <option value="0">0.00</option>
                                                    <option value="1000">1,000</option>
                                                    <option value="1500">1,500</option>
                                                    <option value="2000">2,000</option>
                                                    <option value="3000">3,000</option>
                                                    <option value="4000">4,000</option>
                                                    <option value="5000">5,000</option>
                                                    <option value="6000">6,000</option>
                                                    <option value="7000">7,000</option>
                                                    <option value="8000">8,000</option>
                                                    <option value="9000">9,000</option>
                                                    <option value="10000">10,000</option>
                                                    <option value="15000">15,000</option>
                                                    <option value="20000">20,000</option>
                                                    <option value="30000">30,000</option>
                                                    <option value="24000">24,000</option>
                                                    <option value="25000">25,000</option>
                                                    <option value="28000">28,000</option>
                                                    <option value="29000">29,000</option>
                                                    <option value="34000">34,000</option>
                                                    <option value="50000">50,000</option>
                                                    <option value="70000">70,000</option>
                                                    <option value="35000">35,000</option>
                                                    <option value="40000">40,000</option>
                                                    <option value="45000">45,000</option>
                                                    <option value="80000">80,000</option>
                                                    <option value="30500">30,500</option>
                                                    <option value="35500">35,500</option>
                                                    <option value="36000">36,000</option>
                                                    <option value="38000">38,000</option>
                                                    <option value="100000">100,000</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="input-group mb-3">
                                                <span class="input-group-text" for="">ชำระเพิ่มเติม</span>
                                                <input type="number" id="pay-extra" class="form-control"
                                                    name="quote_payment_extra" placeholder="0.00">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="input-group mb-3">
                                                <span class="input-group-text" for="">จำนวนเงินที่ต้องชำระ</span>
                                                <input type="number" class="form-control pax-total"
                                                    name="quote_payment_total" step="0.01" placeholder="0.00">
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <input type="radio" name="quote_payment_type" id="quote-payment-full"
                                                    value="full"> <label for="quote-payment-type"> ชำระเต็มจำนวน</label>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="input-group mb-3">
                                                <span class="input-group-text" id="basic-addon1">ภายในวันที่</span>
                                                <input type="datetime-local" class="form-control"
                                                    id="quote-payment-date-full" name="quote_payment_date_full"
                                                    value="">
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="input-group mb-3">
                                                <span class="input-group-text" for="">จำนวนเงิน</span>
                                                <input type="number" class="form-control"
                                                    name="quote_payment_total_full" id="payment-total-full"
                                                    step="0.01" placeholder="0.00">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <input type="hidden" id="booking-create-date" value="{{ date('Y-m-d') }}">
                        </div>
                    </div>
                    <div class="text-end mt-3">
                        <input type="hidden" name="quote_vat_exempted_amount">
                        <input type="hidden" name="quote_pre_tax_amount">
                        <input type="hidden" name="quote_discount">
                        <input type="hidden" name="quote_pre_vat_amount">
                        <input type="hidden" name="quote_vat">
                        <input type="hidden" name="quote_include_vat">
                        <input type="hidden" name="quote_grand_total" id="quote-grand-total">
                        <input type="hidden" name="quote_withholding_tax">
                        <input type="hidden" name="quote_pax_total" id="quote-pax-total">
                        <a href="{{ route('quote.index') }}" class="btn btn-secondary btn-sm"><i
                                class="fa fa-arrow-left"></i> กลับ</a>
                        <button type="submit" class="btn btn-primary btn-sm mx-3" form="formQuoteModern"><i
                                class="fa fa-save"></i> สร้างใบเสนอราคา</button>

                    </div>
                    <br>
                </form>
            </div>
            <br>
        </div>
    </div>

    <script>
        $(function() {

                   function formatNumber(num) {
                return Number(num).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }


            

            // เมื่อคลิก 'เลือกวันที่' ให้แสดง list วันที่เดินทางของทัวร์ที่เลือก
            $(document).on('click', '#list-period', function(e) {
                e.preventDefault();
                var tourId = $('#tour-id').val();
                $('#date-list').empty();
                if (!tourId) {
                    $('#date-list').append(
                        '<div class="list-group-item text-danger">กรุณาเลือกแพคเกจทัวร์ก่อน</div>');
                    return;
                }
                $.ajax({
                    url: '{{ route('api.period') }}',
                    method: 'GET',
                    data: {
                        search: tourId
                    },
                    success: function(periods) {
                        if (Array.isArray(periods) && periods.length > 0) {
                            var now = new Date();
                            $.each(periods, function(i, period) {
                                var dateObject = new Date(period.start_date);
                                if (dateObject > now) {
                                    var dateText = dateObject.toLocaleDateString(
                                        'th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        });
                                    var periodHtml =
                                        `<a href="#" class="period-select list-group-item list-group-item-action mb-1" data-tour="${tourId}" data-numday="${$('#numday option:selected').text()}" data-airline="${$('#airline').val()}" data-wholesale="${$('#wholesale').val()}" data-code="${$('#tour-code').val()}" data-name1="${$('#tourSearch1').val()}" data-name="${$('#tourSearch').val()}" data-period1="${period.price1}" data-period2="${period.price2}" data-period3="${period.price3}" data-period4="${period.price4}" data-date="${period.start_date}">${dateText}</a>`;
                                    $('#date-list').append(periodHtml);
                                }
                            });
                        } else {
                            $('#date-list').append(
                                '<div class="list-group-item text-danger">ไม่พบช่วงวันเดินทาง</div>'
                            );
                        }
                    },
                    error: function() {
                        $('#date-list').append(
                            '<div class="list-group-item text-danger">เกิดข้อผิดพลาดในการดึงข้อมูลวันเดินทาง</div>'
                        );
                    }
                });
            });
            // --- Customer Autocomplete (เหมือน create.blade.php) ---
            $('#customerSearch').on('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });
            // --- Thai date string to yyyy-MM-dd ---
            function thaiDateToISO(thaiDateStr) {
                if (!thaiDateStr) return '';
                // ตัวอย่าง: "7 สิงหาคม 2568"
                const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม',
                    'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                ];
                const parts = thaiDateStr.trim().split(' ');
                if (parts.length !== 3) return '';
                let [d, m, y] = parts;
                d = d.padStart(2, '0');
                const monthIdx = months.indexOf(m);
                if (monthIdx === -1) return '';
                m = (monthIdx + 1).toString().padStart(2, '0');
                y = (parseInt(y, 10) - 543).toString();
                return `${y}-${m}-${d}`;
            }
            $('#customerSearch').on('input', function(e) {
                var searchTerm = $(this).val();
                if (searchTerm.length >= 2) {
                    $.ajax({
                        url: '{{ route('api.customer') }}',
                        method: 'GET',
                        data: {
                            search: searchTerm
                        },
                        success: function(data) {
                            $('#customerResults').empty();
                            if (data.length > 0) {
                                $.each(data, function(index, item) {
                                    $('#customerResults').append(`
                                <a href="#" class="list-group-item list-group-item-action"
                                    data-id="${item.customer_id}"
                                    data-name="${item.customer_name}"
                                    data-email="${item.customer_email}"
                                    data-taxid="${item.customer_texid}"
                                    data-tel="${item.customer_tel}"
                                    data-fax="${item.customer_fax}"
                                    data-address="${item.customer_address}"
                                >${item.customer_email} - ${item.customer_name} - ${item.customer_tel}</a>
                            `);
                                });
                                // เพิ่มรายการ "กำหนดเอง"
                                $('#customerResults').append(`
                            <a href="#" id="custom-input" class="list-group-item list-group-item-action">กำหนดเอง</a>
                        `);
                            }
                        }
                    });
                } else {
                    $('#customerResults').empty();
                }
            });
            // เมื่อเลือกข้อมูลจากรายการค้นหา
            $(document).on('click', '#customerResults a', function(e) {
                e.preventDefault();
                var selectedId = $(this).data('id') || '';
                var selectedText = $(this).data('name') || '';
                var customerEmail = $(this).data('email') || '';
                var customerTaxid = $(this).data('taxid') || '';
                var customerTel = $(this).data('tel') || '';
                var customerFax = $(this).data('fax') || '';
                var customerAddress = $(this).data('address') || '';
                if ($(this).attr('id') === 'custom-input') {
                    var customSearchText = $('#customerSearch').val();
                    $('#customer_email').val('');
                    $('#texid').val('');
                    $('#customer_tel').val('');
                    $('#customer_fax').val('');
                    $('#customer_address').val('');
                    $('#customerSearch').val(customSearchText);
                    $('#customer-id').val('');
                    $('#customer-new').val('customerNew');
                } else {
                    $('#customer_email').val(customerEmail);
                    $('#texid').val(customerTaxid);
                    $('#customer_tel').val(customerTel);
                    $('#customer_fax').val(customerFax);
                    $('#customer_address').val(customerAddress);
                    $('#customerSearch').val(selectedText);
                    $('#customer-id').val(selectedId);
                    $('#customer-new').val('customerOld');
                }
                $('#customerResults').empty();
            });
            // ปิดผลลัพธ์เมื่อคลิกนอก
            $(document).on('click', function(event) {
                if (!$(event.target).closest('#customerResults, #customerSearch').length) {
                    $('#customerResults').empty();
                }
            });
            // แก้ select2 ใช้กับ row แรกของข้อมูลค่าบริการ
            $('.product-select.select2').select2({
                width: '100%'
            });
            // trigger คำนวณใหม่เมื่อเปลี่ยน VAT Include/Exclude
            $('input[name="vat_type"]').on('change', function() {
                calculatePaymentCondition();
            });
            // trigger คำนวณ withholding ทันทีเมื่อเปลี่ยน checkbox สรุป
            $('#withholding-tax').on('change', function() {
                calculatePaymentCondition();
            });

            // ฟังก์ชันคำนวณยอดเงินมัดจำและ sync ช่องชำระเต็มจำนวน
            function syncDepositAndFullPayment() {
                var isDeposit = $('#quote-payment-deposit').is(':checked');
                var isFull = $('#quote-payment-full').is(':checked');
                var depositRate = parseFloat($('#quote-payment-price').val().replace(/,/g, '')) || 0;
                var pax = parseFloat($('#quote-pax-total').val().replace(/,/g, '')) || 0;
                var payExtra = parseFloat($('#pay-extra').val().replace(/,/g, '')) || 0;
                var grandTotal = parseFloat($('#grand-total').text().replace(/,/g, '')) || 0;
                var depositTotal = 0;
                // กรณีเลือกเงินมัดจำ
                if (isDeposit) {
                    depositTotal = (depositRate * pax) + payExtra;
                    $('input[name="quote_payment_total"]').val(depositTotal.toFixed(2));
                    // set default payment date to next day from today
                    var today = new Date();
                    today.setDate(today.getDate() + 1);
                    today.setHours(13, 0, 0, 0);
                    var year = today.getFullYear();
                    var month = ('0' + (today.getMonth() + 1)).slice(-2);
                    var day = ('0' + today.getDate()).slice(-2);
                    var hours = ('0' + today.getHours()).slice(-2);
                    var minutes = ('0' + today.getMinutes()).slice(-2);
                    var formattedDate = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
                    $('input[name="quote_payment_date"]').val(formattedDate);
                    $('#quote-payment-date').val(formattedDate);
                    $('#quote-payment-date-new').val(formattedDate);
                } else if (isFull) {
                    // ถ้าเลือกชำระเต็มจำนวน แต่มีการกรอก payExtra ให้คำนวณ depositTotal เฉพาะ payExtra
                    if (payExtra > 0) {
                        depositTotal = payExtra;
                        $('input[name="quote_payment_total"]').val(depositTotal.toFixed(2));
                    } else {
                        $('input[name="quote_payment_total"]').val('');
                    }
                }
                // sync ช่องชำระเต็มจำนวน (ยอดที่เหลือ) ให้แสดงเสมอ
                var remain = grandTotal - depositTotal;
                if (remain < 0) remain = 0;
                $('#payment-total-full').val(remain.toFixed(2));
                // ถ้าเลือกเงินมัดจำ ให้ readonly ช่องนี้, ถ้าเลือกชำระเต็มจำนวน ให้แก้ไขได้
                if (isDeposit) {
                    $('#payment-total-full').prop('readonly', true);
                } else if (isFull) {
                    $('#payment-total-full').prop('readonly', false);
                }
            }

            // เมื่อเลือก radio ชำระเต็มจำนวน
            $('#quote-payment-full').on('change', function() {
                if ($(this).is(':checked')) {
                    // set default payment date for full payment to next day from today
                    var today = new Date();
                    today.setDate(today.getDate() + 1);
                    today.setHours(13, 0, 0, 0);
                    var year = today.getFullYear();
                    var month = ('0' + (today.getMonth() + 1)).slice(-2);
                    var day = ('0' + today.getDate()).slice(-2);
                    var hours = ('0' + today.getHours()).slice(-2);
                    var minutes = ('0' + today.getMinutes()).slice(-2);
                    var formattedDate = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
                    $('input[name="quote_payment_date_full"]').val(formattedDate);
                    $('#quote-payment-date-full').val(formattedDate);
                    // clear all deposit fields
                    $('#quote-payment-price').val('0');
                    $('#pay-extra').val('');
                    $('input[name="quote_payment_total"]').val('');
                    $('input[name="quote_payment_date"]').val('');
                    $('#quote-payment-date').val('');
                    $('#quote-payment-date-new').val('');
                    syncDepositAndFullPayment();
                }
            });
            // เมื่อเลือก radio เงินมัดจำ หรือเปลี่ยนเรทเงินมัดจำ/จำนวน pax ให้คำนวณใหม่
            $('#quote-payment-deposit, #quote-payment-price').on('change input', function() {
                if ($('#quote-payment-deposit').is(':checked')) {
                    syncDepositAndFullPayment();
                }
            });
            // เมื่อกรอก payExtra ให้ trigger syncDepositAndFullPayment() เสมอ ไม่ว่าจะเลือก deposit หรือ full
            $('#pay-extra').on('change input', function() {
                syncDepositAndFullPayment();
            });
            // เมื่อผู้ใช้เลือก radio เงินมัดจำ ให้ set วันที่เป็นวันถัดไปของวันปัจจุบันเสมอ
            $('#quote-payment-deposit').on('change', function() {
                if ($(this).is(':checked')) {
                    // set default deposit rate to 5000
                    $('#quote-payment-price').val('5000');
                    // set default payment date to next day from today
                    var today = new Date();
                    today.setDate(today.getDate() + 1);
                    today.setHours(13, 0, 0, 0);
                    var year = today.getFullYear();
                    var month = ('0' + (today.getMonth() + 1)).slice(-2);
                    var day = ('0' + today.getDate()).slice(-2);
                    var hours = ('0' + today.getHours()).slice(-2);
                    var minutes = ('0' + today.getMinutes()).slice(-2);
                    var formattedDate = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
                    $('input[name="quote_payment_date"]').val(formattedDate);
                    $('#quote-payment-date').val(formattedDate);
                    $('#quote-payment-date-new').val(formattedDate);

                    // set full payment date ตาม logic ใหม่
                    var travelDateStr = $('#date-start').val();
                    if (travelDateStr) {
                        var travelDate = new Date(travelDateStr);
                        var now = new Date();
                        now.setHours(0, 0, 0, 0);
                        var diffDays = (travelDate - now) / (1000 * 60 * 60 * 24);
                        var fullPayDateObj;
                        if (diffDays > 30) {
                            // มากกว่า 30 วันก่อนเดินทาง: set full payment date = 30 วันก่อนวันเดินทาง
                            travelDate.setDate(travelDate.getDate() - 30);
                            travelDate.setHours(13, 0, 0, 0);
                            fullPayDateObj = travelDate;
                        } else {
                            // น้อยกว่าหรือเท่ากับ 30 วัน: set full payment date = วันถัดไปของวันปัจจุบัน
                            fullPayDateObj = new Date();
                            fullPayDateObj.setDate(fullPayDateObj.getDate() + 1);
                            fullPayDateObj.setHours(13, 0, 0, 0);
                        }
                        var y = fullPayDateObj.getFullYear();
                        var m = ('0' + (fullPayDateObj.getMonth() + 1)).slice(-2);
                        var d = ('0' + fullPayDateObj.getDate()).slice(-2);
                        var h = ('0' + fullPayDateObj.getHours()).slice(-2);
                        var min = ('0' + fullPayDateObj.getMinutes()).slice(-2);
                        var fullPayDate = y + '-' + m + '-' + d + 'T' + h + ':' + min;
                        $('input[name="quote_payment_date_full"]').val(fullPayDate);
                        $('#quote-payment-date-full').val(fullPayDate);
                    } else {
                        // If no travel date, clear full payment date
                        $('input[name="quote_payment_date_full"]').val('');
                        $('#quote-payment-date-full').val('');
                    }

                    // recalculate and set deposit total immediately
                    syncDepositAndFullPayment();
                }
            });

            // Ensure that when travel date changes and deposit is selected, full payment date is always 30 days before travel date
            $('#date-start').on('change input', function() {
                if ($('#quote-payment-deposit').is(':checked')) {
                    var travelDateStr = $('#date-start').val();
                    if (travelDateStr) {
                        var travelDate = new Date(travelDateStr);
                        var now = new Date();
                        now.setHours(0, 0, 0, 0);
                        var diffDays = (travelDate - now) / (1000 * 60 * 60 * 24);
                        var fullPayDateObj;
                        if (diffDays > 30) {
                            travelDate.setDate(travelDate.getDate() - 30);
                            travelDate.setHours(13, 0, 0, 0);
                            fullPayDateObj = travelDate;
                        } else {
                            fullPayDateObj = new Date();
                            fullPayDateObj.setDate(fullPayDateObj.getDate() + 1);
                            fullPayDateObj.setHours(13, 0, 0, 0);
                        }
                        var y = fullPayDateObj.getFullYear();
                        var m = ('0' + (fullPayDateObj.getMonth() + 1)).slice(-2);
                        var d = ('0' + fullPayDateObj.getDate()).slice(-2);
                        var h = ('0' + fullPayDateObj.getHours()).slice(-2);
                        var min = ('0' + fullPayDateObj.getMinutes()).slice(-2);
                        var fullPayDate = y + '-' + m + '-' + d + 'T' + h + ':' + min;
                        $('input[name="quote_payment_date_full"]').val(fullPayDate);
                        $('#quote-payment-date-full').val(fullPayDate);
                    } else {
                        $('input[name="quote_payment_date_full"]').val('');
                        $('#quote-payment-date-full').val('');
                    }
                }
            });
            // เมื่อจำนวน pax เปลี่ยน (triggered จาก calculatePaymentCondition)
            $('#quote-pax-total').on('change input', function() {
                if ($('#quote-payment-deposit').is(':checked')) {
                    syncDepositAndFullPayment();
                }
            });
            // เรียกทุกครั้งที่คำนวณใหม่
            var oldCalculatePaymentCondition = calculatePaymentCondition;
            calculatePaymentCondition = function() {
                oldCalculatePaymentCondition();
                syncDepositAndFullPayment();
            };
            // เมื่อเลือกหรือเปลี่ยนวันออกเดินทาง (input[type=date]) ให้ sync hidden และคำนวณวันเดินทางกลับ
            $('#date-start-display').on('change input', function() {
                var val = $(this).val();
                if (val) {
                    // sync hidden field
                    $('#date-start').val(val);
                    // คำนวณวันเดินทางกลับ
                    var numDays = parseInt($('#numday option:selected').data('day')) || 0;
                    if (numDays > 0) {
                        var dateObject = new Date(val);
                        var endDate = new Date(dateObject);
                        endDate.setDate(dateObject.getDate() + numDays - 1);
                        var endStr = endDate.toISOString().slice(0, 10);
                        $('#date-end').val(endStr);
                        $('#date-end-display').val(endStr);
                    }
                    // ตรวจสอบวันออกเดินทางต้องไม่ย้อนหลังจากวันนี้
                    var today = new Date();
                    today.setHours(0, 0, 0, 0);
                    var dateObject = new Date(val);
                    if (dateObject < today) {
                        alert('วันออกเดินทางต้องไม่ย้อนหลังจากวันปัจจุบัน');
                    }
                    // เรียกฟังก์ชันคำนวณเงื่อนไขการชำระเงิน
                    calculatePaymentCondition();
                }
            });
            // เมื่อเลือกหรือกรอกวันเดินทางกลับ ให้คำนวณวันออกเดินทางย้อนหลัง (ใช้ระยะเวลาทัวร์)
            $('#date-end-display').on('change.auto', function() {
                var val = $(this).val();
                var datePattern = /^\d{4}-\d{2}-\d{2}$/;
                var endDate = null;
                if (datePattern.test(val)) {
                    endDate = new Date(val);
                } else {
                    endDate = new Date(val);
                }
                if (endDate && !isNaN(endDate.getTime())) {
                    $('#date-end').val(endDate.toISOString().slice(0, 10));
                    // คำนวณวันออกเดินทางย้อนหลัง
                    var numDays = parseInt($('#numday option:selected').data('day')) || 0;
                    if (numDays > 0) {
                        var startDate = new Date(endDate);
                        startDate.setDate(endDate.getDate() - numDays + 1);
                        // ตรวจสอบวันออกเดินทางต้องไม่ย้อนหลังจากวันนี้
                        var today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (startDate < today) {
                            alert('วันออกเดินทางต้องไม่ย้อนหลังจากวันปัจจุบัน');
                        }
                        $('#date-start').val(startDate.toISOString().slice(0, 10));
                        $('#date-start-display').val(startDate.toISOString().slice(0, 10));
                    }
                }
            });

            // เมื่อเปลี่ยนระยะเวลาทัวร์ (วัน/คืน) ให้คำนวณวันเดินทางกลับใหม่ถ้ามีวันออกเดินทาง
            $('#numday').on('change.auto', function() {
                var startVal = $('#date-start-display').val();
                var datePattern = /^\d{4}-\d{2}-\d{2}$/;
                var dateObject = null;
                if (datePattern.test(startVal)) {
                    dateObject = new Date(startVal);
                } else {
                    dateObject = new Date(startVal);
                }
                if (dateObject && !isNaN(dateObject.getTime())) {
                    var numDays = parseInt($('#numday option:selected').data('day')) || 0;
                    if (numDays > 0) {
                        var endDate = new Date(dateObject);
                        endDate.setDate(dateObject.getDate() + numDays - 1);
                        $('#date-end').val(endDate.toISOString().slice(0, 10));
                        $('#date-end-display').val(endDate.toISOString().slice(0, 10));
                    }
                }
            });

     

            // ฟังก์ชันคำนวณเงื่อนไขการชำระเงิน (Deposit/Full) และข้อมูลค่าบริการ (pax, รวม, vat, discount, grand total)
            function calculatePaymentCondition() {
                // --- เงื่อนไขการชำระเงิน ---
                var bookingCreateDate = new Date($('#date-start').val());
                var travelDate = new Date($('#date-start').val());
                var dateNow = new Date();
                var bookingDate = new Date($('#booking-create-date').val());
                var diffDays = (travelDate - bookingDate) / (1000 * 60 * 60 * 24);
                if (diffDays >= 31) {
                    bookingCreateDate.setDate(bookingCreateDate.getDate() - 30);
                    $('#quote-payment-deposit').prop('checked', true);
                    // set default deposit rate to 5000 when auto-select deposit
                    $('#quote-payment-price').val('5000');
                } else {
                    bookingCreateDate = new Date();
                    bookingCreateDate.setDate(dateNow.getDate() + 1);
                    $('#quote-payment-full').prop('checked', true);
                }
                bookingCreateDate.setHours(13, 0, 0, 0);
                var year = bookingCreateDate.getFullYear();
                var month = ('0' + (bookingCreateDate.getMonth() + 1)).slice(-2);
                var day = ('0' + bookingCreateDate.getDate()).slice(-2);
                var hours = ('0' + bookingCreateDate.getHours()).slice(-2);
                var minutes = ('0' + bookingCreateDate.getMinutes()).slice(-2);
                var formattedDate = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
                $('input[name="quote_payment_date"]').val(formattedDate);
                $('#quote-payment-date').val(formattedDate);
                $('#quote-payment-date-new').val(formattedDate);
                $('input[name="quote_payment_date_full"]').val(formattedDate);
                $('#quote-payment-date-full').val(formattedDate);

                // --- คำนวณข้อมูลค่าบริการ ---
                var sumTotalNonVat = 0;
                var sumTotalVat = 0;
                var sumDiscount = 0;
                var sumPreVat = 0;
                var sumVat = 0;
                var sumIncludeVat = 0;
                var grandTotal = 0;
                var withholdingAmount = 0;
                var paxTotal = 0;
                var vatRate = 0.07;
                var withholdingRows = [];
                sumDiscount = 0; 

                // คำนวณรายการบริการ
                $('#table-income > .row.item-row.table-income:visible').each(function() {
                    var $row = $(this);
                    var qty = parseFloat($row.find('input[name="quantity[]"]').val()) || 0;
                    var price = parseFloat($row.find('input[name="price_per_unit[]"]').val()) || 0;
                    var isVat = $row.find('select[name="vat_status[]"]').val() === 'vat';
                    var isPax = $row.find('select[name="product_id[]"] option:selected').data('pax') === 'Y';
                    var isWithholding = $row.find('input.vat-3').is(':checked');
                    var rowTotal = qty * price;
                    // แก้ไข: ถ้าติ๊ก vat-3 ให้บวก 3% เฉพาะแถวนี้ (ไม่ต้องใช้ plus3 แยก)
                    if (isWithholding) {
                        rowTotal = rowTotal * 1.03;
                    }
                    $row.find('input[name="total_amount[]"]').val(rowTotal.toFixed(2));
                    if (isVat) {
                        sumTotalVat += rowTotal;
                    } else {
                        sumTotalNonVat += rowTotal;
                    }
                    if (isPax) {
                        paxTotal += qty;
                    }
                });

                // คำนวณส่วนลดแยกต่างหาก
                $('#discount-list .discount-row:visible').each(function() {
                    var $row = $(this);
                    var qty = parseFloat($row.find('input[name="quantity[]"]').val()) || 0;
                    var price = parseFloat($row.find('input[name="price_per_unit[]"]').val()) || 0;
                    var total = qty * price;
                    $row.find('input[name="total_amount[]"]').val(total.toFixed(2));
                    sumDiscount += total;
                });

                // --- VAT Calculation ---
                var vatType = $('input[name="vat_type"]:checked').val();
                var listVatTotal = sumTotalVat; // ใช้ยอดรวมเฉพาะแถว vat
                if (listVatTotal === 0) {
                    // ไม่มีรายการ vat เลย
                    sumPreVat = 0;
                    sumVat = 0;
                    sumIncludeVat = 0;
                    grandTotal = sumTotalNonVat - sumDiscount;
                } else {
                    if (vatType === 'include') {
                        // VAT รวมอยู่ในยอดแล้ว
                        var vatBase = listVatTotal - sumDiscount;
                        sumPreVat = vatBase * 100 / 107;
                        sumVat = sumPreVat * vatRate;
                        sumIncludeVat = sumPreVat + sumVat;
                        grandTotal = sumTotalNonVat + sumIncludeVat;
                    } else {
                        if (sumDiscount < listVatTotal) {
                            sumPreVat = listVatTotal - sumDiscount;
                            sumVat = sumPreVat * vatRate;
                            sumIncludeVat = sumPreVat + sumVat;
                            grandTotal = sumTotalNonVat + sumIncludeVat;
                        } else {
                            sumPreVat = 0;
                            sumVat = 0;
                            sumIncludeVat = 0;
                            grandTotal = sumTotalNonVat;
                        }
                    }
                }

                // คำนวณหักภาษี ณ ที่จ่าย (Withholding Tax)
                withholdingAmount = $('#withholding-tax').is(':checked') ? sumPreVat * 0.03 : 0;
                // อัปเดตแสดงผลทันทีเมื่อเปลี่ยน checkbox
                $('#withholding-amount').text(withholdingAmount.toFixed(2));

                // set ค่า summary
                $('#sum-total-nonvat').text(formatNumber(sumTotalNonVat.toFixed(2)));
                $('#sum-total-vat').text(formatNumber(sumTotalVat.toFixed(2)));
                $('#sum-discount').text(formatNumber(sumDiscount.toFixed(2)));
                $('#sum-pre-vat').text(formatNumber(sumPreVat.toFixed(2)));
                $('#vat-amount').text(formatNumber(sumVat.toFixed(2)));
                $('#sum-include-vat').text(formatNumber(sumIncludeVat.toFixed(2)));
                $('#grand-total').text(formatNumber(grandTotal.toFixed(2)));
                $('#withholding-amount').text(formatNumber(withholdingAmount.toFixed(2)));
                $('#pax').text('Pax: ' + paxTotal);
                $('#quote-pax-total').val(paxTotal);
                // hidden fields
                $('input[name="quote_vat_exempted_amount"]').val(sumTotalNonVat.toFixed(2));
                $('input[name="quote_pre_tax_amount"]').val(sumTotalVat.toFixed(2));
                $('input[name="quote_discount"]').val(sumDiscount.toFixed(2));
                $('input[name="quote_pre_vat_amount"]').val(sumPreVat.toFixed(2));
                $('input[name="quote_vat"]').val(sumVat.toFixed(2));
                $('input[name="quote_include_vat"]').val(sumIncludeVat.toFixed(2));
                $('input[name="quote_grand_total"]').val(grandTotal.toFixed(2));
                $('input[name="quote_withholding_tax"]').val(withholdingAmount.toFixed(2));
            }

            // trigger คำนวณค่าบริการทุกครั้งที่มีการเปลี่ยนแปลง
            $(document).on('input change', '.quantity, .price-per-unit, .vat-status, .vat-3, .expense-type',
                function() {
                    // คำนวณ total-amount สำหรับแถวนี้ทันที
                    calculateRowTotal($(this).closest('.row'));
                    calculatePaymentCondition();
                });

            // เพิ่ม event listener สำหรับ discount rows
            $(document).on('input change', '.discount-qty, .discount-price, .discount-vat, .discount-product-select',
                function() {
                    // คำนวณ total-amount สำหรับ discount row นี้ทันที
                    calculateRowTotal($(this).closest('.discount-row'));
                    calculatePaymentCondition();
                });

            // ฟังก์ชันคำนวณ total ของแถวเดียว
            function calculateRowTotal($row) {
                var qty = parseFloat($row.find('input[name="quantity[]"]').val()) || 0;
                var price = parseFloat($row.find('input[name="price_per_unit[]"]').val()) || 0;
                var total = qty * price;
                
                // ถ้าเป็นแถวบริการและมีการติ๊ก withholding tax
                if (!$row.hasClass('discount-row') && $row.find('input.vat-3').is(':checked')) {
                    total = total + (total * 0.03);
                }
                
                $row.find('input[name="total_amount[]"]').val(total.toFixed(2));
            }

            // --- เลือกวันออกเดินทางจาก list (รองรับวันที่ไทย) ---
            $(document).on('click', '#date-list .list-group-item', function(e) {
                e.preventDefault();
                var dateText = $(this).text().trim();
                var isoDate = thaiDateToISO(dateText);
                if (isoDate) {
                    $('#date-start-display').val(isoDate).trigger('change');
                    $('#date-start').val(isoDate);
                } else {
                    // fallback: ใส่ค่าตามที่เลือก
                    $('#date-start-display').val(dateText).trigger('change');
                    $('#date-start').val(dateText);
                }
                $('#date-list').empty();
            });


            // เพิ่มรายการบริการ (row)
            $('#add-row-service').on('click', function() {
                var rowCount = $('#table-income > .row').length + 1;
                var rowId = 'service-row-' + Date.now();
                var rowHtml = `
                <!-- Desktop row -->
                <div class="row item-row table-income align-items-center d-none d-md-flex">
                    <div class="col-md-1"><span class="row-number"></span></div>
                    <div class="col-md-3">
                        <select name="product_id[]" class="form-select product-select select2" style="width: 100%;">
                            <option value="">--เลือกสินค้า--</option>
                            @forelse ($products as $product)
                                <option data-pax="{{ $product->product_pax }}" value="{{ $product->id }}">{{ $product->product_name }}{{ $product->product_pax === 'Y' ? '(Pax)' : '' }}</option>
                            @empty
                            @endforelse
                        </select>
                    </div>
                    <div class="col-md-1" style="display: none">
                        <select name="expense_type[]" class="form-select">
                            <option selected value="income"> รายได้ </option>
                        </select>
                    </div>
                    <div class="col-md-1">
                        <input type="hidden" name="withholding_tax[]" value="N">
                        <input type="checkbox" name="withholding_tax[]" class="vat-3" value="Y">
                    </div>
                    <div class="col-md-1 text-center">
                        <select name="vat_status[]" class="vat-status form-select" style="width: 110%;">
                            <option selected value="nonvat">nonVat</option>
                            <option value="vat">Vat</option>
                        </select>
                    </div>
                    <div class="col-md-1"><input type="number" name="quantity[]" class="quantity form-control text-end" step="1" value="1"></div>
                    <div class="col-md-2"><input type="number" name="price_per_unit[]" class="price-per-unit form-control text-end period1" step="0.01" value="0"></div>
                    <div class="col-md-2"><input type="number" name="total_amount[]" class="total-amount form-control text-end" value="0" readonly></div>
                    <div class="col-md-1 text-center">
                        <button type="button" class="btn btn-danger btn-sm remove-row-btn " title="ลบแถว"><i class="fa fa-trash" ></i></button>
                    </div>
                </div>
                <!-- Mobile row -->
                <div class="row item-row table-income align-items-center d-flex d-md-none" style="margin-bottom:12px;">
                    <div><b>ลำดับ:</b> <span class="row-number"></span></div>
                    <div><b>สินค้า:</b>
                        <select name="product_id[]" class="form-select product-select select2" style="width: 100%;">
                            <option value="">--เลือกสินค้า--</option>
                            @forelse ($products as $product)
                                <option data-pax="{{ $product->product_pax }}" value="{{ $product->id }}">{{ $product->product_name }}{{ $product->product_pax === 'Y' ? '(Pax)' : '' }}</option>
                            @empty
                            @endforelse
                        </select>
                    </div>
                    <div style="display:none">
                        <select name="expense_type[]" class="form-select">
                            <option selected value="income"> รายได้ </option>
                        </select>
                    </div>
                    <div><b>3%:</b> <input type="hidden" name="withholding_tax[]" value="N">
                        <input type="checkbox" name="withholding_tax[]" class="vat-3" value="Y">
                    </div>
                    <div><b>NonVat:</b>
                        <select name="vat_status[]" class="vat-status form-select" style="width: 100%;">
                            <option selected value="nonvat">nonVat</option>
                            <option value="vat">Vat</option>
                        </select>
                    </div>
                    <div><b>จำนวน:</b> <input type="number" name="quantity[]" class="quantity form-control text-end" step="1" value="1"></div>
                    <div><b>ราคา/หน่วย:</b> <input type="number" name="price_per_unit[]" class="price-per-unit form-control text-end period1" step="0.01" value="0"></div>
                    <div><b>ยอดรวม:</b> <input type="number" name="total_amount[]" class="total-amount form-control text-end" value="0" readonly></div>
                    <div>
                        <button type="button" class="btn btn-danger btn-sm remove-row-btn " title="ลบแถว" style="font-size: 13px 10px;width:100%"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
                `;
                $('#table-income').append(rowHtml);
                // init select2 เฉพาะแถวใหม่
                var $select = $('#table-income .row:last .product-select.select2');
                $select.select2({
                    width: '100%'
                });
                updateRowNumbers();
                calculatePaymentCondition();
            });

            // ฟังก์ชันอัปเดตเลขลำดับ row
            function updateRowNumbers() {
                $('#table-income > .row').each(function(i) {
                    $(this).find('.row-number').text(i + 1);
                });
            }

            // ลบรายการบริการ
            $(document).on('click', '.remove-row-btn', function() {
                if ($('#table-income .row').length > 1) {
                    $(this).closest('.row').remove();
                    updateRowNumbers();
                    calculatePaymentCondition();
                }
            });

            // ลบรายการส่วนลด
            $(document).on('click', '.remove-discount-row', function() {
                $(this).closest('.discount-row').remove();
                updateDiscountRowNumbers();
                calculatePaymentCondition(); // trigger คำนวณยอดรวมใหม่หลังลบส่วนลด
            });

            // อัปเดตเลขลำดับครั้งแรก (กรณีมี row เดียว)
            updateRowNumbers();

            // เพิ่มส่วนลด
            $('#add-row-discount').on('click', function() {
                addDiscountRow();
                updateDiscountRowNumbers();
                calculatePaymentCondition();
            });

            // เพิ่ม discount row แรกอัตโนมัติถ้ายังไม่มี (เหมือนต้นฉบับ)
            // ไม่ต้องเพิ่ม discount row แรกอัตโนมัติ ให้ discount-list ว่างไว้ก่อน

            // ฟังก์ชันเพิ่ม discount row
            function addDiscountRow(rowData) {
                var rowCount = $('.discount-row').length + 1;
                var rowId = 'discount-row-' + Date.now();
                var selectedProduct = rowData && rowData.product_id ? rowData.product_id : '';
                var qty = rowData && rowData.qty ? rowData.qty : 1;
                var price = rowData && rowData.price ? rowData.price : 0;
                var vat = rowData && rowData.vat ? rowData.vat : 'nonvat';
                var isWithholding = rowData && rowData.withholding_tax === 'Y' ? 'checked' : '';
                var total = qty * price;
                var rowHtml = `
                <!-- Desktop row -->
                <div class="row item-row table-discount mb-1 align-items-center discount-row d-none d-md-flex" data-row-id="${rowId}" style="background:#fffbe7;border-radius:8px;padding:8px 0;">
                    <div class="col-md-1 text-center discount-row-number">${rowCount}</div>
                    <div class="col-md-3">
                        <select name="product_id[]" class="form-select product-select select2 discount-product-select" style="width: 100%;">
                            <option value="">--เลือกส่วนลด--</option>
                            @foreach ($productDiscount as $product)
                                <option value="{{ $product->id }}">{{ $product->product_name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="col-md-1" style="display: none">
                        <select name="expense_type[]" class="form-select">
                            <option value="discount" selected> ส่วนลด </option>
                        </select>
                    </div>
                    <div class="col-md-1 text-center">
                        <input type="hidden" name="withholding_tax[]" value="N">
                    </div>
                    <div class="col-md-1 text-center">
                        <select name="vat_status[]" class="vat-status form-select" style="width: 110%;">
                            <option value="nonvat" >nonVat</option>
                        </select>
                    </div>
                    <div class="col-md-1"><input type="number" name="quantity[]" class="quantity discount-qty form-control text-end" step="1" value="${qty}"></div>
                    <div class="col-md-2"><input type="number" name="price_per_unit[]" class="price-per-unit discount-price form-control text-end" step="0.01" value="${price}"></div>
                    <div class="col-md-2"><input type="number" name="total_amount[]" class="total-amount form-control text-end" value="${total.toFixed(2)}" readonly></div>
                    <div class="col-md-1 text-center">
                        <button type="button" class="btn btn-danger btn-sm remove-discount-row" title="ลบแถว"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
                <!-- Mobile row -->
                <div class="row item-row table-discount mb-1 align-items-center discount-row d-flex d-md-none" data-row-id="${rowId}" style="background:#fffbe7;border-radius:8px;padding:8px 0;">
                    <div><b>ลำดับ:</b> <span class="discount-row-number">${rowCount}</span></div>
                    <div><b>ส่วนลด:</b>
                        <select name="product_id[]" class="form-select product-select select2 discount-product-select" style="width: 100%;">
                            <option value="">--เลือกส่วนลด--</option>
                            @foreach ($productDiscount as $product)
                                <option value="{{ $product->id }}">{{ $product->product_name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div style="display:none">
                        <select name="expense_type[]" class="form-select">
                            <option value="discount" selected> ส่วนลด </option>
                        </select>
                    </div>
                    <div><input type="hidden" name="withholding_tax[]" value="N"></div>
                    <div><b>NonVat:</b>
                        <select name="vat_status[]" class="vat-status form-select" style="width: 100%;">
                            <option value="nonvat" >nonVat</option>
                        </select>
                    </div>
                    <div><b>จำนวน:</b> <input type="number" name="quantity[]" class="quantity discount-qty form-control text-end" step="1" value="${qty}"></div>
                    <div><b>ราคา/หน่วย:</b> <input type="number" name="price_per_unit[]" class="price-per-unit discount-price form-control text-end" step="0.01" value="${price}"></div>
                    <div><b>ยอดรวม:</b> <input type="number" name="total_amount[]" class="total-amount form-control text-end" value="${total.toFixed(2)}" readonly></div>
                    <div>
                        <button type="button" class="btn btn-danger btn-sm remove-discount-row" title="ลบแถว" style="width:100%"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
                `;
                $('#discount-list').append(rowHtml);
                // init select2 เฉพาะแถวใหม่ (ใช้ element ที่ render จริง)
                var $select = $('#discount-list .discount-row:last .product-select.select2');
                $select.select2({
                    width: '100%'
                });
                if (selectedProduct) {
                    $select.val(selectedProduct).trigger('change');
                }
            }

            // ลบแถวส่วนลด
            $(document).on('click', '.remove-discount-row', function() {
                $(this).closest('.discount-row').remove();
                updateDiscountRowNumbers();
                calculatePaymentCondition();
            });

            // อัปเดตเลขลำดับ discount row
            function updateDiscountRowNumbers() {
                $('#discount-list .discount-row-number').each(function(i) {
                    $(this).text(i + 1);
                });
            }

            // trigger คำนวณเมื่อเปลี่ยน discount row
            $(document).on('input change',
                '.discount-qty, .discount-price, .discount-vat, .discount-product-select',
                function() {
                    var $row = $(this).closest('.discount-row');
                    var qty = parseFloat($row.find('.discount-qty').val()) || 0;
                    var price = parseFloat($row.find('.discount-price').val()) || 0;
                    var total = qty * price;
                    $row.find('.discount-total').val(total.toFixed(2));
                    calculatePaymentCondition();
                });

            // --- Discount Product List (for select2 in discount row) ---
            var discountProducts = [
                @foreach ($productDiscount as $product)
                    {
                        id: '{{ $product->id }}',
                        text: @json($product->product_name),
                        vat: '{{ $product->vat_status }}',
                    },
                @endforeach
            ];
            // ป้องกัน submit form เมื่อกด Enter ในช่องค้นหาแพคเกจทัวร์ และเลือกผลลัพธ์แรกอัตโนมัติ (เหมือนต้นฉบับ)
            $('#tourSearch').on('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var $first = $('#tourResults a.list-group-item-action').first();
                    if ($first.length) {
                        $first.trigger('click');
                    }
                }
            });
            // Autocomplete ค้นหาแพคเกจทัวร์ (logic เหมือนต้นฉบับ)
            $('#tourSearch').on('input', function(e) {
                var searchTerm = $(this).val();
                if (searchTerm.length >= 2) {
                    $.ajax({
                        url: '{{ route('api.tours') }}',
                        method: 'GET',
                        data: {
                            search: searchTerm
                        },
                        success: function(data) {
                            $('#tourResults').empty();
                            if (data.length > 0) {
                                // limit แค่ 5 รายการ
                                var limited = data.slice(0, 5);
                                $.each(limited, function(index, item) {
                                    $('#tourResults').append(
                                        `<a href="#" id="tour-select" class="list-group-item list-group-item-action" data-tour="${item.id}" data-numday="${item.num_day}" data-airline="${item.airline_id}" data-wholesale="${item.wholesale_id}" data-code="${item.code}" data-name1="${item.code} - ${item.name}" data-name="${item.code} - ${item.code1} - ${item.name}">${item.code} - ${item.code1} - ${item.name}</a>`
                                    );
                                });
                            }
                            // เพิ่มตัวเลือก "กำหนดเอง"
                            $('#tourResults').append(
                                `<a href="#" class="list-group-item list-group-item-action" data-name="${searchTerm}">กำหนดเอง</a>`
                            );
                        }
                    });
                } else {
                    $('#tourResults').empty();
                }
            });

            // ปุ่ม reset การค้นหาแพคเกจทัวร์
            $('#resetTourSearch').on('click', function() {
                $('#tourSearch').val('');
                $('#tourResults').empty();
                $('#tour-id').val('');
                $('#tourSearch1').val('');
                $('#tour-code').val('');
                // reset dropdowns ที่เกี่ยวข้อง (optional, ถ้าต้องการ)
                // $('#airline').val('').trigger('change');
                // $('#numday').val('');
                // $('#wholesale').val('').trigger('change');
                // $('#country').val('').trigger('change');
            });
            // เมื่อคลิกเลือกแพคเกจจากผลลัพธ์การค้นหา
            $(document).on('click', '#tourResults a', function(e) {
                e.preventDefault();
                var selectedCode = $(this).data('code') || '';
                var selectedText = $(this).data('name');
                var selectedText1 = $(this).data('name1');
                var selectedAirline = $(this).data('airline');
                var selectedNumday = $(this).data('numday');
                var selectedTour = $(this).data('tour');
                $('#tour-id').val(selectedTour);
                $('#tourSearch').val(selectedText);
                $('#tourSearch1').val(selectedText1);
                $('#tour-code').val(selectedCode);
                $('#tourResults').empty();
                // set airline
                $('#airline').val(selectedAirline).change();
                // set numday
                $('#numday option').each(function() {
                    var optionText = $.trim($(this).text());
                    if (optionText === $.trim(selectedNumday)) {
                        $(this).prop('selected', true);
                        return false;
                    }
                });
                // set wholesale
                var selectedWholesale = $(this).data('wholesale');
                if (selectedWholesale) {
                    $.ajax({
                        url: '{{ route('api.wholesale') }}',
                        method: 'GET',
                        data: {
                            search: selectedWholesale
                        },
                        success: function(data) {
                            if (data) {
                                if (!$('#wholesale option[value="' + data.id + '"]').length) {
                                    $('#wholesale').append(
                                        `<option value="${data.id}">${data.wholesale_name_th}</option>`
                                    );
                                }
                                $('#wholesale').val(data.id).trigger('change');
                            }
                        }
                    });
                }
                // set country
                if (selectedCode) {
                    $.ajax({
                        url: '{{ route('api.country') }}',
                        method: 'GET',
                        data: {
                            search: selectedCode
                        },
                        success: function(data) {
                            if (data) {
                                if (!$('#country option[value="' + data.id + '"]').length) {
                                    $('#country').append(
                                        `<option value="${data.id}">${data.country_name_th}</option>`
                                    );
                                }
                                $('#country').val(data.id).trigger('change');
                            }
                        }
                    });
                }
                // เรียก AJAX ดึงช่วงวันเดินทาง (period) หลังเลือกทัวร์
                if (selectedTour) {
                    $.ajax({
                        url: '{{ route('api.period') }}',
                        method: 'GET',
                        data: {
                            search: selectedTour
                        },
                        success: function(data) {
                            $('#date-list').empty();
                            var now = new Date();
                            if (Array.isArray(data) && data.length > 0) {
                                $.each(data, function(index, period) {
                                    var dateObject = new Date(period.start_date);
                                    // เฉพาะวันที่มากกว่าหรือเท่ากับวันนี้
                                    if (dateObject > now) {
                                        var dateText = dateObject.toLocaleDateString(
                                            'th-TH', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            });
                                        $('#date-list').append(`
                                    <a href="#" class="list-group-item period-select" data-period1="${period.price1}" data-period2="${period.price2}" data-period3="${period.price3}" data-period4="${period.price4}" data-date="${period.start_date}">${dateText}</a>
                                `);
                                    }
                                });
                            }
                            // ไม่ต้องแสดงปุ่ม/ข้อความ "ระบุวันเดินทางเอง" อีกต่อไป
                        }
                    });
                }
            });

            // เมื่อคลิกเลือกวันที่จาก list
            $(document).on('click', '.period-select', function(e) {
                e.preventDefault();
                var selectedDate = $(this).data('date');
                var period1 = $(this).data('period1');
                var period2 = $(this).data('period2');
                var period3 = $(this).data('period3');
                var period4 = $(this).data('period4');
                $('.period1').val(period1);
                $('#period2').val(period2);
                $('#period3').val(period3);
                $('#period4').val(period4);
                // แปลงวันที่เป็นไทย
                var dateObject = new Date(selectedDate);
                var thaiFormattedDate = dateObject.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                $('#date-start-display').val(selectedDate);
                $('#date-start').val(selectedDate);
                $('#date-list').empty();
                // คำนวณวันเดินทางกลับ
                var numDays = parseInt($('#numday option:selected').data('day')) || 0;
                if (numDays > 0 && selectedDate) {
                    var start = new Date(selectedDate);
                    var endDate = new Date(start);
                    endDate.setDate(start.getDate() + numDays - 1);
                    var thaiFormattedEndDate = endDate.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    $('#date-end-display').val(endDate.toISOString().slice(0, 10));
                    $('#date-end').val(endDate.toISOString().slice(0, 10));
                }
                // เรียกฟังก์ชันคำนวณเงื่อนไขการชำระเงิน
                calculatePaymentCondition();
            });

            // ลบ logic/handler สำหรับปุ่มหรือข้อความ "ระบุวันเดินทางเอง" (ไม่ต้องมีอีกต่อไป)
            // ปิดผลลัพธ์เมื่อคลิกนอก
            $(document).on('click', function(event) {
                if (!$(event.target).closest('#tourResults, #tourSearch').length) {
                    $('#tourResults').empty();
                }
            });
        });


        $('form').on('submit', function() {
  $('.row.item-row.table-income').each(function() {
    if ($(this).css('display') === 'none') {
      $(this).find('input, select, textarea').remove();
    }
  });
});

    </script>
@endsection

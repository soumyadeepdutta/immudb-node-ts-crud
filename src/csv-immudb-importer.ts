import * as fs from 'fs';
import * as path from 'path';
import ImmudbClient from 'immudb-node';

const mba_candidates = 'mba_students';

interface MBACandidateRecord {
  AcademicYear: string;
  ProgramID: string;
  ProgramShortName: string;
  UserId: string;
  ApplicationID: string;
  CandidateName: string;
  ApplicantCategoryId: string;
  ApplicantCategory: string;
  AdmissionCategoryId: string;
  AdmissionCategory: string;
  CasteName: string;
  Gender: string;
  DOB: string;
  ReligionID: string;
  Religion: string;
  MotherTongueId: string;
  MotherTongue: string;
  IncomeId: string;
  AnnualFamilyIncome: string;
  FinalCandidatureType: string;
  FinalPHType: string;
  FinalDefenceType: string | null;
  LingusticMinority: string;
  ReligiousMinority: string;
  CandidateMobile: string;
  Email: string;
  AdmittedChoiceCode: string;
  AdmittedChoiceCodeDisplay: string;
  AdmittedCourseName: string;
  AdmittedInstituteCode: string;
  AdmittedInstituteName: string;
  AdmittedInstituteDistrict: string;
  AdmittedInstituteStatus1: string;
  AdmittedInstituteStatus2: string;
  AdmittedInstituteStatus3: string;
  AdmittedCourseStatus1: string;
  AdmittedCourseStatus2: string;
  AdmittedCourseStatus3: string;
  AdmittedCourseGender: string;
  SeatTypeAllotted: string;
  CAPorIL: string;
  CAPRoundNo: string;
  CAPRoundDetails: string;
  TotalFees: string;
  AdmissionDate: string;
  AdmissionUploadDate: string;
  StateMeritSLGMN: string | null;
  AllIndiaMeritNo: string | null;
  MeritMarks: string;
  CAPAdmissionTFWS: string | null;
  CAPAdmissionEWS: string | null;
  CAPAdmissionOrphan: string | null;
  NON_CAP: string;
  MotherName: string | null;
  Status: string;
  StatusDetails: string;
}

interface JSONExportData {
  type: string;
  name?: string;
  version?: string;
  comment?: string;
  database?: string;
  data?: MBACandidateRecord[];
}

async function importJSONToImmuDB(): Promise<void> {
  const client = new ImmudbClient({
    host: 'localhost',
    port: 3322
  });

  try {
    console.log('🔌 Connecting to ImmuDB...');

    // Connect to ImmuDB
    await client.login({
      user: 'immudb',
      password: 'immudb'
    });

    console.log('✅ Connected to ImmuDB successfully');

    // Create or use database
    const dbName = 'mba_data';
    try {
      await client.createDatabase({ databasename: dbName });
      console.log(`📊 Created database: ${dbName}`);
    } catch (error: any) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`📊 Using existing database: ${dbName}`);
      } else {
        throw error;
      }
    }

    await client.useDatabase({ databasename: dbName });

    // Read JSON file
    const jsonFilePath = path.join(__dirname, '..', 'data', 'MBA_CANDIDATE_FLAT_DATA_2024.json');
    console.log(`📖 Reading JSON file: ${jsonFilePath}`);

    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const parsedData: JSONExportData[] = JSON.parse(jsonData);

    // Find the table data
    const tableData = parsedData.find(item => item.type === 'table' && item.data);

    if (!tableData || !tableData.data) {
      throw new Error('No table data found in JSON file');
    }

    const candidates = tableData.data;
    console.log(`📊 Found ${candidates.length} candidate records`);

    // Create table schema using SQL DDL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${mba_candidates} (
        id INTEGER AUTO_INCREMENT,
        academic_year VARCHAR(10),
        program_id VARCHAR(20),
        program_short_name VARCHAR(10),
        user_id VARCHAR(20),
        application_id VARCHAR(20),
        candidate_name VARCHAR(100),
        applicant_category_id VARCHAR(5),
        applicant_category VARCHAR(20),
        admission_category_id VARCHAR(5),
        admission_category VARCHAR(20),
        caste_name VARCHAR(50),
        gender VARCHAR(5),
        dob VARCHAR(20),
        religion_id VARCHAR(5),
        religion VARCHAR(20),
        mother_tongue_id VARCHAR(5),
        mother_tongue VARCHAR(20),
        income_id VARCHAR(5),
        annual_family_income VARCHAR(50),
        final_candidature_type VARCHAR(150),
        final_ph_type VARCHAR(200),
        final_defence_type VARCHAR(20),
        lingustic_minority VARCHAR(50),
        religious_minority VARCHAR(50),
        candidate_mobile VARCHAR(50),
        email VARCHAR(100),
        admitted_choice_code VARCHAR(20),
        admitted_choice_code_display VARCHAR(20),
        admitted_course_name VARCHAR(255),
        admitted_institute_code VARCHAR(10),
        admitted_institute_name VARCHAR(200),
        admitted_institute_district VARCHAR(50),
        admitted_institute_status1 VARCHAR(50),
        admitted_institute_status2 VARCHAR(50),
        admitted_institute_status3 VARCHAR(50),
        admitted_course_status1 VARCHAR(50),
        admitted_course_status2 VARCHAR(50),
        admitted_course_status3 VARCHAR(50),
        admitted_course_gender VARCHAR(5),
        seat_type_allotted VARCHAR(50),
        cap_or_il VARCHAR(10),
        cap_round_no VARCHAR(50),
        cap_round_details VARCHAR(50),
        total_fees VARCHAR(20),
        admission_date VARCHAR(20),
        admission_upload_date VARCHAR(50),
        state_merit_slgmn VARCHAR(20),
        all_india_merit_no VARCHAR(20),
        merit_marks VARCHAR(20),
        cap_admission_tfws VARCHAR(10),
        cap_admission_ews VARCHAR(10),
        cap_admission_orphan VARCHAR(10),
        non_cap VARCHAR(10),
        mother_name VARCHAR(100),
        status VARCHAR(5),
        status_details VARCHAR(20),
        PRIMARY KEY (id)
      )
    `;

    console.log('🏗️ Creating table schema...');
    await client.SQLExec({
      sql: createTableSQL
    });
    console.log('✅ Table schema created/verified');

    // Insert data using SQL bulk insertion
    let insertedCount = 0;
    const batchSize = 1000; // Process 1000 records at a time

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);

      // Create VALUES clause for bulk insert
      const values = batch.map(candidate => {
        // Escape single quotes in strings
        const escape = (str: string | null) => {
          if (!str) return '';
          return str.replace(/'/g, "''");
        };

        return `(
          '${escape(candidate.AcademicYear)}',
          '${escape(candidate.ProgramID)}',
          '${escape(candidate.ProgramShortName)}',
          '${escape(candidate.UserId)}',
          '${escape(candidate.ApplicationID)}',
          '${escape(candidate.CandidateName)}',
          '${escape(candidate.ApplicantCategoryId)}',
          '${escape(candidate.ApplicantCategory)}',
          '${escape(candidate.AdmissionCategoryId)}',
          '${escape(candidate.AdmissionCategory)}',
          '${escape(candidate.CasteName)}',
          '${escape(candidate.Gender)}',
          '${escape(candidate.DOB)}',
          '${escape(candidate.ReligionID)}',
          '${escape(candidate.Religion)}',
          '${escape(candidate.MotherTongueId)}',
          '${escape(candidate.MotherTongue)}',
          '${escape(candidate.IncomeId)}',
          '${escape(candidate.AnnualFamilyIncome)}',
          '${escape(candidate.FinalCandidatureType)}',
          '${escape(candidate.FinalPHType)}',
          '${escape(candidate.FinalDefenceType)}',
          '${escape(candidate.LingusticMinority)}',
          '${escape(candidate.ReligiousMinority)}',
          '${escape(candidate.CandidateMobile)}',
          '${escape(candidate.Email)}',
          '${escape(candidate.AdmittedChoiceCode)}',
          '${escape(candidate.AdmittedChoiceCodeDisplay)}',
          '${escape(candidate.AdmittedCourseName)}',
          '${escape(candidate.AdmittedInstituteCode)}',
          '${escape(candidate.AdmittedInstituteName)}',
          '${escape(candidate.AdmittedInstituteDistrict)}',
          '${escape(candidate.AdmittedInstituteStatus1)}',
          '${escape(candidate.AdmittedInstituteStatus2)}',
          '${escape(candidate.AdmittedInstituteStatus3)}',
          '${escape(candidate.AdmittedCourseStatus1)}',
          '${escape(candidate.AdmittedCourseStatus2)}',
          '${escape(candidate.AdmittedCourseStatus3)}',
          '${escape(candidate.AdmittedCourseGender)}',
          '${escape(candidate.SeatTypeAllotted)}',
          '${escape(candidate.CAPorIL)}',
          '${escape(candidate.CAPRoundNo)}',
          '${escape(candidate.CAPRoundDetails)}',
          '${escape(candidate.TotalFees)}',
          '${escape(candidate.AdmissionDate)}',
          '${escape(candidate.AdmissionUploadDate)}',
          '${escape(candidate.StateMeritSLGMN)}',
          '${escape(candidate.AllIndiaMeritNo)}',
          '${escape(candidate.MeritMarks)}',
          '${escape(candidate.CAPAdmissionTFWS)}',
          '${escape(candidate.CAPAdmissionEWS)}',
          '${escape(candidate.CAPAdmissionOrphan)}',
          '${escape(candidate.NON_CAP)}',
          '${escape(candidate.MotherName)}',
          '${escape(candidate.Status)}',
          '${escape(candidate.StatusDetails)}'
        )`;
      }).join(',');

      const bulkInsertSQL = `
        INSERT INTO ${mba_candidates} (
          academic_year, program_id, program_short_name, user_id, application_id,
          candidate_name, applicant_category_id, applicant_category, admission_category_id,
          admission_category, caste_name, gender, dob, religion_id, religion,
          mother_tongue_id, mother_tongue, income_id, annual_family_income,
          final_candidature_type, final_ph_type, final_defence_type, lingustic_minority,
          religious_minority, candidate_mobile, email, admitted_choice_code,
          admitted_choice_code_display, admitted_course_name, admitted_institute_code,
          admitted_institute_name, admitted_institute_district, admitted_institute_status1,
          admitted_institute_status2, admitted_institute_status3, admitted_course_status1,
          admitted_course_status2, admitted_course_status3, admitted_course_gender,
          seat_type_allotted, cap_or_il, cap_round_no, cap_round_details, total_fees,
          admission_date, admission_upload_date, state_merit_slgmn, all_india_merit_no,
          merit_marks, cap_admission_tfws, cap_admission_ews, cap_admission_orphan,
          non_cap, mother_name, status, status_details
        ) VALUES ${values}
      `;

      try {
        await client.SQLExec({
          sql: bulkInsertSQL
        });
        insertedCount += batch.length;
        console.log(`📝 Bulk inserted ${insertedCount}/${candidates.length} records...`);
      } catch (error: any) {
        console.error(`❌ Error in bulk insert batch starting at ${i}:`, error.message);
        // If bulk insert fails, try individual inserts for this batch
        // for (const candidate of batch) {
        //   try {
        //     const singleInsertSQL = `
        //       INSERT INTO mba_candidates (
        //         academic_year, program_id, program_short_name, user_id, application_id,
        //         candidate_name, applicant_category_id, applicant_category, admission_category_id,
        //         admission_category, caste_name, gender, dob, religion_id, religion,
        //         mother_tongue_id, mother_tongue, income_id, annual_family_income,
        //         final_candidature_type, final_ph_type, final_defence_type, lingustic_minority,
        //         religious_minority, candidate_mobile, email, admitted_choice_code,
        //         admitted_choice_code_display, admitted_course_name, admitted_institute_code,
        //         admitted_institute_name, admitted_institute_district, admitted_institute_status1,
        //         admitted_institute_status2, admitted_institute_status3, admitted_course_status1,
        //         admitted_course_status2, admitted_course_status3, admitted_course_gender,
        //         seat_type_allotted, cap_or_il, cap_round_no, cap_round_details, total_fees,
        //         admission_date, admission_upload_date, state_merit_slgmn, all_india_merit_no,
        //         merit_marks, cap_admission_tfws, cap_admission_ews, cap_admission_orphan,
        //         non_cap, mother_name, status, status_details
        //       ) VALUES (
        //         @academic_year, @program_id, @program_short_name, @user_id, @application_id,
        //         @candidate_name, @applicant_category_id, @applicant_category, @admission_category_id,
        //         @admission_category, @caste_name, @gender, @dob, @religion_id, @religion,
        //         @mother_tongue_id, @mother_tongue, @income_id, @annual_family_income,
        //         @final_candidature_type, @final_ph_type, @final_defence_type, @lingustic_minority,
        //         @religious_minority, @candidate_mobile, @email, @admitted_choice_code,
        //         @admitted_choice_code_display, @admitted_course_name, @admitted_institute_code,
        //         @admitted_institute_name, @admitted_institute_district, @admitted_institute_status1,
        //         @admitted_institute_status2, @admitted_institute_status3, @admitted_course_status1,
        //         @admitted_course_status2, @admitted_course_status3, @admitted_course_gender,
        //         @seat_type_allotted, @cap_or_il, @cap_round_no, @cap_round_details, @total_fees,
        //         @admission_date, @admission_upload_date, @state_merit_slgmn, @all_india_merit_no,
        //         @merit_marks, @cap_admission_tfws, @cap_admission_ews, @cap_admission_orphan,
        //         @non_cap, @mother_name, @status, @status_details
        //       )
        //     `;

        //     const params = {
        //       sql: singleInsertSQL,
        //       paramsList: [{
        //         academic_year: candidate.AcademicYear || '',
        //         program_id: candidate.ProgramID || '',
        //         program_short_name: candidate.ProgramShortName || '',
        //         user_id: candidate.UserId || '',
        //         application_id: candidate.ApplicationID || '',
        //         candidate_name: candidate.CandidateName || '',
        //         applicant_category_id: candidate.ApplicantCategoryId || '',
        //         applicant_category: candidate.ApplicantCategory || '',
        //         admission_category_id: candidate.AdmissionCategoryId || '',
        //         admission_category: candidate.AdmissionCategory || '',
        //         caste_name: candidate.CasteName || '',
        //         gender: candidate.Gender || '',
        //         dob: candidate.DOB || '',
        //         religion_id: candidate.ReligionID || '',
        //         religion: candidate.Religion || '',
        //         mother_tongue_id: candidate.MotherTongueId || '',
        //         mother_tongue: candidate.MotherTongue || '',
        //         income_id: candidate.IncomeId || '',
        //         annual_family_income: candidate.AnnualFamilyIncome || '',
        //         final_candidature_type: candidate.FinalCandidatureType || '',
        //         final_ph_type: candidate.FinalPHType || '',
        //         final_defence_type: candidate.FinalDefenceType || '',
        //         lingustic_minority: candidate.LingusticMinority || '',
        //         religious_minority: candidate.ReligiousMinority || '',
        //         candidate_mobile: candidate.CandidateMobile || '',
        //         email: candidate.Email || '',
        //         admitted_choice_code: candidate.AdmittedChoiceCode || '',
        //         admitted_choice_code_display: candidate.AdmittedChoiceCodeDisplay || '',
        //         admitted_course_name: candidate.AdmittedCourseName || '',
        //         admitted_institute_code: candidate.AdmittedInstituteCode || '',
        //         admitted_institute_name: candidate.AdmittedInstituteName || '',
        //         admitted_institute_district: candidate.AdmittedInstituteDistrict || '',
        //         admitted_institute_status1: candidate.AdmittedInstituteStatus1 || '',
        //         admitted_institute_status2: candidate.AdmittedInstituteStatus2 || '',
        //         admitted_institute_status3: candidate.AdmittedInstituteStatus3 || '',
        //         admitted_course_status1: candidate.AdmittedCourseStatus1 || '',
        //         admitted_course_status2: candidate.AdmittedCourseStatus2 || '',
        //         admitted_course_status3: candidate.AdmittedCourseStatus3 || '',
        //         admitted_course_gender: candidate.AdmittedCourseGender || '',
        //         seat_type_allotted: candidate.SeatTypeAllotted || '',
        //         cap_or_il: candidate.CAPorIL || '',
        //         cap_round_no: candidate.CAPRoundNo || '',
        //         cap_round_details: candidate.CAPRoundDetails || '',
        //         total_fees: candidate.TotalFees || '',
        //         admission_date: candidate.AdmissionDate || '',
        //         admission_upload_date: candidate.AdmissionUploadDate || '',
        //         state_merit_slgmn: candidate.StateMeritSLGMN || '',
        //         all_india_merit_no: candidate.AllIndiaMeritNo || '',
        //         merit_marks: candidate.MeritMarks || '',
        //         cap_admission_tfws: candidate.CAPAdmissionTFWS || '',
        //         cap_admission_ews: candidate.CAPAdmissionEWS || '',
        //         cap_admission_orphan: candidate.CAPAdmissionOrphan || '',
        //         non_cap: candidate.NON_CAP || '',
        //         mother_name: candidate.MotherName || '',
        //         status: candidate.Status || '',
        //         status_details: candidate.StatusDetails || ''
        //       }]
        //     };

        //     await client.SQLExec(params);
        //     insertedCount++;
        //   } catch (singleError: any) {
        //     console.error(`❌ Error inserting single record ${candidate.ApplicationID}:`, singleError.message);
        //   }
        // }
      }
    }

    console.log(`✅ Successfully imported ${insertedCount} records to ImmuDB`);

    // Verify the import using SQL
    console.log('\n� Verifying import...');
    try {
      const countResult = await client.SQLQuery({
        sql: `SELECT COUNT(*) as total FROM ${mba_candidates}`
      });

      if (countResult && countResult.length > 0) {
        const firstRow = countResult[0] as any;
        const totalRecords = firstRow?.values?.[0]?.value || 0;
        console.log(`📊 Total records in database: ${totalRecords}`);
      }
    } catch (error: any) {
      console.log('📊 Count verification failed:', error.message);
    }

    // Show sample data using SQL
    console.log('\n📋 Sample records:');
    try {
      const sampleResult = await client.SQLQuery({
        sql: `SELECT candidate_name, application_id, admitted_course_name FROM ${mba_candidates} LIMIT 5`
      });

      if (sampleResult && sampleResult.length > 0) {
        sampleResult.forEach((row: any, index: number) => {
          const name = row.values?.[0]?.value || 'N/A';
          const appId = row.values?.[1]?.value || 'N/A';
          const course = row.values?.[2]?.value || 'N/A';
          console.log(`${index + 1}. ${name} (${appId}) - ${course}`);
        });
      } else {
        console.log('No sample records found');
      }
    } catch (error: any) {
      console.log('📋 Sample records fetch failed:', error.message);
    }

  } catch (error: any) {
    console.error('❌ Error importing data:', error.message);
    throw error;
  } finally {
    try {
      await client.logout();
      console.log('🔌 Disconnected from ImmuDB');
    } catch (error: any) {
      console.log('🔌 Connection already closed');
    }
  }
}

async function readFirst10Records(): Promise<void> {
  const client = new ImmudbClient({
    host: 'localhost',
    port: 3322
  });

  try {
    console.log('🔌 Connecting to ImmuDB for reading...');

    // Connect to ImmuDB
    await client.login({
      user: 'immudb',
      password: 'immudb'
    });

    console.log('✅ Connected to ImmuDB successfully');

    // Use the database
    const dbName = 'mba_data';
    await client.useDatabase({ databasename: dbName });

    console.log('\n📋 First 10 records from ImmuDB:');
    console.log('═'.repeat(80));

    // Use SQL to get the first 10 records
    try {
      const result = await client.SQLQuery({
        sql: `SELECT 
                    application_id, 
                    candidate_name, 
                    admitted_course_name, 
                    admitted_institute_name, 
                    admitted_institute_district,
                    status,
                    status_details,
                    total_fees,
                    admission_date
                FROM ${mba_candidates} 
                ORDER BY id 
                LIMIT 10`
      });

      if (result && result.length > 0) {
        result.forEach((row: any, index: number) => {
          try {
            const appId = row.values?.[0]?.value || 'N/A';
            const name = row.values?.[1]?.value || 'N/A';
            const course = row.values?.[2]?.value || 'N/A';
            const institute = row.values?.[3]?.value || 'N/A';
            const district = row.values?.[4]?.value || 'N/A';
            const status = row.values?.[5]?.value || 'N/A';
            const statusDetails = row.values?.[6]?.value || 'N/A';
            const fees = row.values?.[7]?.value || 'N/A';
            const admissionDate = row.values?.[8]?.value || 'N/A';

            console.log(`${index + 1}. Application ID: ${appId}`);
            console.log(`   Name: ${name}`);
            console.log(`   Course: ${course}`);
            console.log(`   Institute: ${institute}`);
            console.log(`   District: ${district}`);
            console.log(`   Status: ${status} (${statusDetails})`);
            console.log(`   Fees: ${fees}`);
            console.log(`   Admission Date: ${admissionDate}`);
            console.log('─'.repeat(60));
          } catch (parseError: any) {
            console.log(`${index + 1}. Error parsing record: ${parseError.message}`);
          }
        });
      } else {
        console.log('No records found in the table');

        // Check if table exists
        // const tableCheck = await client.SQLQuery({
        //     sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='mba_candidates'"
        // });

        // if (!tableCheck || tableCheck.length === 0) {
        //     console.log('❌ Table "mba_candidates" does not exist');
        // } else {
        //     console.log('✅ Table exists but is empty');
        // }
      }
    } catch (queryError: any) {
      console.error('❌ Error executing query:', queryError.message);
    }

  } catch (error: any) {
    console.error('❌ Error reading data:', error.message);
    throw error;
  } finally {
    try {
      await client.logout();
      console.log('🔌 Disconnected from ImmuDB');
    } catch (error: any) {
      console.log('🔌 Connection already closed');
    }
  }
}

// Main execution
if (require.main === module) {
  importJSONToImmuDB()
    .then(() => {
      console.log('🎉 Import completed successfully!');
      console.log('\n📖 Now reading first 10 records...');
      return readFirst10Records();
    })
    .then(() => {
      console.log('🎉 All operations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Operation failed:', error.message);
      process.exit(1);
    });
}

export { importJSONToImmuDB, readFirst10Records };

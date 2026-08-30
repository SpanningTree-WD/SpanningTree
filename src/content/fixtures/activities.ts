import type { Activity } from '../../models/activity'

const activity=(id:string,slug:string,title:string,date:string,type:string,summary:string,variant:string,relations:Partial<Activity>={}):Activity=>({id,slug,title,date,type,summary,description:`${summary} 참가자들은 발표와 토론을 통해 서로의 관점을 연결하고, 배운 내용을 다음 세대를 위한 기록으로 남겼습니다.`,coverImage:{variant,alt:`${title} 행사 기록 이미지`},gallery:[{variant,alt:`${title} 발표 현장`,caption:'발표와 토론이 진행된 현장'}],tags:[type],relatedMathematics:[],relatedPublications:[],featured:false,status:'published',createdAt:`${date}T00:00:00Z`,updatedAt:`${date}T00:00:00Z`,...relations})
export const activityFixtures:Activity[]=[
 activity('activity-forum-2025','ksa-spanning-tree-forum','KSA × Spanning Tree Forum','2025-05-17','Forum','최신 연구 동향을 공유하고 학문적 교류를 확장하는 포럼입니다.','a',{featured:true,relatedMathematics:['math-sylow'],relatedPublications:['publication-forum-2025']}),
 activity('activity-mini-lecture-2025','mini-lecture-day','Mini Lecture Day','2025-04-12','Mini Lecture','추상적인 수학을 짧고 실제적인 언어로 소개하는 미니 강연 행사입니다.','b',{featured:true,relatedMathematics:['math-fundamental-groups']}),
 activity('activity-integration-bee-2025','integration-bee','Integration Bee','2025-03-08','Competition','문제 해결력과 아이디어를 겨루는 수학 경시 활동입니다.','c',{featured:true}),
 activity('activity-exchange-2025','research-exchange-seminar','Research Exchange Seminar','2025-02-20','Exchange','다른 학교·기관과 수학 주제를 공유하고 토론하는 교류 세미나입니다.','a'),
 activity('activity-topology-2025','topology-workshop','Topology Workshop','2025-01-11','Workshop','위상수학의 개념부터 연구 주제까지 함께 학습하는 워크숍입니다.','b',{relatedMathematics:['math-fundamental-groups']}),
 activity('activity-draft','future-number-theory-workshop','Future Number Theory Workshop','2026-09-12','Workshop','준비 중인 정수론 워크숍입니다.','c',{status:'draft'})]

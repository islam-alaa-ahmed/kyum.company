(function(){
  'use strict';
  const db=()=>{if(!window.customerSupabase)throw new Error('اتصال Supabase غير جاهز.');return window.customerSupabase};
  const profile=()=>window.CustomerAuth?.getState?.().profile||null;
  async function loadConfig(){
    const [{data:system,error:se},{data:events,error:ee},{data:rules,error:re},{data:users,error:ue}]=await Promise.all([
      db().from('notification_system_settings').select('id,is_enabled').eq('id',1).maybeSingle(),
      db().from('notification_event_settings').select('event_key,event_name,module_name,is_enabled,in_app_enabled,push_enabled,display_order,target_view').order('display_order'),
      db().from('notification_event_recipient_rules').select('id,event_key,recipient_type,role_key,user_id,is_active').eq('is_active',true),
      db().from('user_profiles').select('id,full_name,email,role,is_active').eq('is_active',true).order('full_name')
    ]);
    if(se)throw new Error('تعذر تحميل إعدادات الإشعارات: '+se.message);if(ee)throw new Error('تعذر تحميل أحداث الإشعارات: '+ee.message);if(re)throw new Error('تعذر تحميل مستلمي الإشعارات: '+re.message);if(ue)throw new Error('تعذر تحميل المستخدمين: '+ue.message);
    return {system:system||{id:1,is_enabled:true},events:events||[],rules:rules||[],users:users||[]};
  }
  async function saveConfig(payload){
    if(!window.CustomerPermissions?.requireAction?.('notificationCenter','edit',{silent:true}))throw new Error('ليس لديك صلاحية تعديل مركز الإشعارات.');
    const uid=profile()?.id||null;
    const {error:sysErr}=await db().from('notification_system_settings').upsert({id:1,is_enabled:payload.masterEnabled!==false,updated_by:uid,updated_at:new Date().toISOString()},{onConflict:'id'});if(sysErr)throw new Error('تعذر حفظ حالة نظام الإشعارات: '+sysErr.message);
    const eventRows=(payload.events||[]).map(x=>({event_key:x.eventKey,is_enabled:!!x.enabled,in_app_enabled:!!x.inApp,push_enabled:!!x.push,updated_by:uid,updated_at:new Date().toISOString()}));
    if(eventRows.length){const {error}=await db().from('notification_event_settings').upsert(eventRows,{onConflict:'event_key'});if(error)throw new Error('تعذر حفظ إعدادات الأحداث: '+error.message)}
    const keys=eventRows.map(x=>x.event_key);if(keys.length){const {error}=await db().from('notification_event_recipient_rules').delete().in('event_key',keys);if(error)throw new Error('تعذر تحديث مستلمي الإشعارات: '+error.message)}
    const rows=[];(payload.events||[]).forEach(ev=>{if(ev.owner)rows.push({event_key:ev.eventKey,recipient_type:'request_owner',is_active:true,created_by:uid});(ev.roles||[]).forEach(role=>rows.push({event_key:ev.eventKey,recipient_type:'role',role_key:role,is_active:true,created_by:uid}));(ev.users||[]).forEach(userId=>rows.push({event_key:ev.eventKey,recipient_type:'user',user_id:userId,is_active:true,created_by:uid}))});
    if(rows.length){const {error}=await db().from('notification_event_recipient_rules').insert(rows);if(error)throw new Error('تعذر حفظ مصفوفة المستلمين: '+error.message)}
    return loadConfig();
  }
  async function listMine(limit=50){const uid=profile()?.id;if(!uid)return[];const {data,error}=await db().from('notifications').select('id,event_key,title,body,target_view,request_id,visit_id,is_read,created_at,metadata').eq('user_id',uid).order('created_at',{ascending:false}).limit(limit);if(error)throw new Error('تعذر تحميل الإشعارات: '+error.message);return data||[]}
  async function markRead(id){const uid=profile()?.id;if(!uid)return;const {error}=await db().from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('id',id).eq('user_id',uid);if(error)throw new Error(error.message)}
  async function markAllRead(){const uid=profile()?.id;if(!uid)return;const {error}=await db().from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('user_id',uid).eq('is_read',false);if(error)throw new Error(error.message)}
  async function emit(eventKey,{requestId=null,visitId=null,metadata={},occurrenceKey=null}={}){if(!profile()?.id)return;const {error}=await db().rpc('emit_notification_event',{p_event_key:eventKey,p_request_id:requestId,p_visit_id:visitId,p_metadata:metadata||{},p_occurrence_key:occurrenceKey||null});if(error)console.warn('[Notifications] emit failed',eventKey,error.message)}
  function subscribe(handler){const uid=profile()?.id;if(!uid)return()=>{};const channel=db().channel('kyum-notifications-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+uid},payload=>handler?.(payload.new)).subscribe();return()=>db().removeChannel(channel)}
  window.NotificationCenterService=Object.freeze({loadConfig,saveConfig,listMine,markRead,markAllRead,emit,subscribe});
})();
